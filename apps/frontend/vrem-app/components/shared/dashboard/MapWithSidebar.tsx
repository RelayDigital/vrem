"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "../../ui/use-mobile";
import { JobRequest, ProviderProfile, ProviderRanking } from "../../../types";
import { MapView } from "../map";
import { ProviderCard } from "../../features/provider/ProviderCard";
import { ProviderCardMinimal } from "../../features/provider/ProviderCardMinimal";
import { JobCard } from "../jobs/JobCard";
import { Button } from "../../ui/button";
import { ScrollArea } from "../../ui/scroll-area";
import { Badge } from "../../ui/badge";
import { Spinner } from "../../ui/spinner";
import { H2, H3, Muted, Small } from "../../ui/typography";
import {
  MapPin,
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  Plus,
  X,
  Filter,
  Eye,
} from "lucide-react";
import { Input } from "../../ui/input";
import { Search } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../../ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { getActiveOrgRoleFromMemberships } from "@/hooks/userRoleInfo";
import { useAuth } from "@/context/auth-context";

interface MapWithSidebarProps {
  jobs: JobRequest[];
  providers: ProviderProfile[];
  selectedJob: JobRequest | null;
  onSelectJob: (job: JobRequest) => void;
  onNavigateToJobInProjectManagement?: (job: JobRequest) => void;
  onJobAssign?: (jobId: string, technicianId: string, score: number) => void;
  className?: string;
  fullScreen?: boolean;
  initialSidebarView?: SidebarView;
  initialJobForRankings?: JobRequest | null;
  onGoBack?: () => void;
  isDispatcherView?: boolean; // If true, use "Pending Assignments" language; if false, use generic "Jobs" language
}

type SidebarView = "pending" | "rankings";
type PriorityFactor = "availability" | "distance" | "score";

const isTechnicianProvider = (
  provider: ProviderProfile
): provider is ProviderProfile & { role: "TECHNICIAN" } =>
  provider.role === "TECHNICIAN";

// Helper function to calculate distance
function calculateDistanceLocal(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function MapWithSidebar({
  jobs,
  providers,
  selectedJob,
  onSelectJob,
  onNavigateToJobInProjectManagement,
  onJobAssign,
  className,
  fullScreen = false,
  initialSidebarView = "pending",
  initialJobForRankings = null,
  onGoBack,
  isDispatcherView = true, // Default to dispatcher view for backwards compatibility
}: MapWithSidebarProps) {
  const [sidebarView, setSidebarView] =
    useState<SidebarView>(initialSidebarView);
  const [jobForRankings, setJobForRankings] = useState<JobRequest | null>(
    initialJobForRankings
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [priorityOrder, setPriorityOrder] = useState<PriorityFactor[]>([
    "availability",
    "distance",
    "score",
  ]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const technicianProviders = useMemo(
    () => providers.filter(isTechnicianProvider),
    [providers]
  );
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null
  );

  const { memberships, activeOrganizationId } = useAuth();
  const activeOrgRole = getActiveOrgRoleFromMemberships(memberships, activeOrganizationId);

  // Allow OWNER/ADMIN to override availability restrictions when assigning technicians
  const canOverrideAvailability = activeOrgRole === "OWNER" || activeOrgRole === "ADMIN";

  const pendingJobs = jobs.filter((j) => j.status === "pending");

  // Filter pending jobs based on search
  const filteredPendingJobs = pendingJobs.filter((job) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      job.propertyAddress.toLowerCase().includes(searchLower) ||
      job.clientName.toLowerCase().includes(searchLower) ||
      job.scheduledDate.toLowerCase().includes(searchLower)
    );
  });

  const handleFindTechnician = (job: JobRequest) => {
    setSelectedProviderId(null); // Clear selected provider
    setJobForRankings(job);
    setSidebarView("rankings");
    // Keep drawer open on mobile when navigating to rankings
  };

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      setSelectedProviderId(null); // Clear selected provider
      setSidebarView("pending");
      setJobForRankings(null);
      // Drawer stays open on mobile when going back to pending
    }
  };

  const displayProviders = providers ?? [];

  // Calculate ranked technicians when in rankings view
  const rankedTechnicians = useMemo(() => {
    if (!jobForRankings) return [];

    const providerScores = technicianProviders
      .filter((p) => p.status === "active")
      .map((provider) => {
        const distanceKm = calculateDistanceLocal(
          provider.homeLocation.lat,
          provider.homeLocation.lng,
          jobForRankings.location.lat,
          jobForRankings.location.lng
        );

        // Check availability
        const availability = provider.availability.find(
          (a) => a.date === jobForRankings.scheduledDate
        );
        const isAvailable = availability?.available || false;

        // Calculate distance score (0-100)
        let distanceScore = 0;
        if (distanceKm <= 5) distanceScore = 100;
        else if (distanceKm <= 15) distanceScore = 75;
        else if (distanceKm <= 30) distanceScore = 50;
        else if (distanceKm <= 50) distanceScore = 25;

        // Calculate reliability score
        const { onTimeRate, noShows, totalJobs } = provider.reliability;
        let reliabilityScore = 50;
        if (totalJobs > 0) {
          const noShowPenalty = (noShows / totalJobs) * 100;
          reliabilityScore = Math.max(
            0,
            Math.min(100, onTimeRate * 100 - noShowPenalty)
          );
        }

        // Calculate skill match score
        const skillMap: Record<string, keyof ProviderProfile["skills"]> = {
          photo: "residential",
          video: "video",
          aerial: "aerial",
          twilight: "twilight",
        };
        let totalSkillScore = 0;
        let skillCount = 0;
        for (const mediaType of jobForRankings.mediaType) {
          const skillKey = skillMap[mediaType];
          if (skillKey && provider.skills[skillKey] !== undefined) {
            totalSkillScore += provider.skills[skillKey];
            skillCount++;
          }
        }
        const skillScore =
          skillCount > 0 ? (totalSkillScore / skillCount) * 20 : 50;

        // Calculate preferred relationship score
        let preferredScore = 0;
        if (provider.preferredClients.includes(jobForRankings.organizationId)) {
          preferredScore = 100;
        }

        // Composite score
        const overallScore =
          (isAvailable ? 100 : 0) * 0.3 +
          preferredScore * 0.25 +
          reliabilityScore * 0.2 +
          distanceScore * 0.15 +
          skillScore * 0.1;

        return {
          provider,
          isAvailable,
          distanceKm,
          distanceScore,
          reliabilityScore,
          skillScore,
          preferredScore,
          overallScore,
        };
      });

    // Sort based on priority order
    const sorted = [...providerScores].sort((a, b) => {
      for (const priority of priorityOrder) {
        let comparison = 0;

        if (priority === "availability") {
          comparison = (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0);
        } else if (priority === "distance") {
          // Round to 1 decimal place for comparison
          const distanceA = Math.round(a.distanceKm * 10) / 10;
          const distanceB = Math.round(b.distanceKm * 10) / 10;
          comparison = distanceA - distanceB;
        } else if (priority === "score") {
          // Round to whole number for comparison
          const scoreA = Math.round(a.overallScore);
          const scoreB = Math.round(b.overallScore);
          comparison = scoreB - scoreA;
        }

        if (comparison !== 0) return comparison;
      }
      return 0;
    });

    return sorted.map((item, index) => ({
      provider: item.provider,
      score: item.overallScore,
      factors: {
        availability: item.isAvailable ? 100 : 0,
        distance: item.distanceScore,
        distanceKm: item.distanceKm,
        reliability: item.reliabilityScore,
        skillMatch: item.skillScore,
        preferredRelationship: item.preferredScore,
      },
      recommended: index === 0 && item.isAvailable && item.overallScore >= 60,
      rank: index + 1,
    })) as (ProviderRanking & { rank: number })[];
  }, [jobForRankings, technicianProviders, priorityOrder]);

  const handleAssign = async (technicianId: string, score: number) => {
    setAssigningId(technicianId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (jobForRankings && onJobAssign) {
        onJobAssign(jobForRankings.id, technicianId, score);
        handleGoBack();
      }
    } catch (error) {
      console.error("Failed to assign technician:", error);
    } finally {
      setAssigningId(null);
    }
  };

  const handlePriorityChange = (index: number, newPriority: PriorityFactor) => {
    const newOrder = [...priorityOrder];
    const currentIndex = newOrder.indexOf(newPriority);

    if (currentIndex !== -1 && currentIndex !== index) {
      const oldPriority = newOrder[index];
      newOrder[index] = newPriority;
      newOrder[currentIndex] = oldPriority;
    } else {
      newOrder[index] = newPriority;
    }

    setPriorityOrder(newOrder);
  };

  const handleAddPriority = () => {
    if (priorityOrder.length >= 3) return;
    const allPriorities: PriorityFactor[] = [
      "availability",
      "distance",
      "score",
    ];
    const availablePriority = allPriorities.find(
      (p) => !priorityOrder.includes(p)
    );
    if (availablePriority) {
      setPriorityOrder([...priorityOrder, availablePriority]);
    }
  };

  const handleRemovePriority = (index: number) => {
    if (priorityOrder.length <= 1) return;
    const newOrder = [...priorityOrder];
    newOrder.splice(index, 1);
    setPriorityOrder(newOrder);
  };

  // Determine what to show on map based on sidebar view
  const mapJobs =
    sidebarView === "rankings" && jobForRankings ? [jobForRankings] : jobs;
  const mapTechnicians =
    sidebarView === "rankings" && jobForRankings
      ? rankedTechnicians.map((r) => r.provider)
      : technicianProviders;

  // Create a Map of technician rankings for MapView
  const technicianRankingsMap = useMemo(() => {
    if (sidebarView !== "rankings" || !jobForRankings) return undefined;
    const map = new Map<
      string,
      {
        ranking: ProviderRanking["factors"];
        score: number;
        recommended: boolean;
      }
    >();
    rankedTechnicians.forEach((r) => {
      map.set(r.provider.userId, {
        ranking: r.factors,
        score: r.score,
        recommended: r.recommended,
      });
    });
    return map;
  }, [sidebarView, jobForRankings, rankedTechnicians]);

  // Pending Assignments Content (reusable for both Card and Drawer)
  const pendingAssignmentsContent = (
    <>
      {sidebarView === "pending" ? (
        <>
          {/* Pending Assignments Header */}
          <CardHeader
            className={`py-4 px-4 md:px-0! space-y-3 gap-0! md:relative sticky top-0 z-50 md:z-10 bg-background`}
          >
            <div className="flex items-center justify-between">
              <div>
                <H3 className="text-lg border-0">
                  {isDispatcherView ? "Pending Assignments" : "Pending Jobs"}
                </H3>
                <Muted className="text-xs">
                  {pendingJobs.length}{" "}
                  {pendingJobs.length === 1 ? "job" : "jobs"}
                </Muted>
              </div>
              <Badge
                variant="outline"
                className="text-orange-600 border-orange-200"
              >
                {pendingJobs.length}
              </Badge>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by address, client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>

          {/* Pending Jobs List - Vertical Scroll */}
          <CardContent
            className={`relative flex-1 p-0! min-h-0 overflow-hidden flex flex-col w-full min-w-0 max-w-full ${
              fullScreen ? "py-4 px-4 md:px-0!" : ""
            }`}
          >
            <ScrollArea className="size-full min-w-0 max-w-full overflow-x-hidden">
              <div className="px-4 pb-4 md:px-0! md:pb-0 space-y-3 min-w-0 w-full max-w-full box-border">
                {filteredPendingJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <CheckCircle2 className="size-12 text-muted-foreground mb-4" />
                    <H3 className="text-lg mb-2">All caught up!</H3>
                    <Muted>
                      {isDispatcherView
                        ? "No pending assignments"
                        : "No pending jobs"}
                    </Muted>
                  </div>
                ) : (
                  filteredPendingJobs.map((job) => (
                    <div
                      key={job.id}
                      className="w-full min-w-0 max-w-full box-border"
                    >
                      <JobCard
                        job={job}
                        horizontal={true}
                        hideRequirements={true}
                        onClick={() => {
                          if (activeOrgRole !== "EDITOR" && activeOrgRole !== "TECHNICIAN") {
                            handleFindTechnician(job);
                          } else {
                            onSelectJob(job);
                          }
                        }}
                        onViewInProjectManagement={
                          onNavigateToJobInProjectManagement
                            ? () => onNavigateToJobInProjectManagement(job)
                            : undefined
                        }
                        selected={selectedJob?.id === job.id}
                      />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </>
      ) : (
        <>
          {/* Ranked Technicians Header */}
          <CardHeader
            className={`py-4 px-4 md:px-0! space-y-3 gap-0! md:relative sticky top-0 z-50 bg-background`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGoBack}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <H3 className="text-lg border-0">Ranked Technicians</H3>
            </div>
            {jobForRankings && (
              <Muted className="text-xs mb-2">
                {jobForRankings.propertyAddress}
              </Muted>
            )}
            <div>
              <Muted className="text-xs">
                {rankedTechnicians.length} available
              </Muted>
            </div>
            {/* Priority Controls */}
            <div className="bg-background py-4 px-0! md:hidden block">
              <div className="space-y-3">
                {/* Priority Controls */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Small className="text-xs font-semibold text-muted-foreground">
                      Sort Priority
                    </Small>
                    {priorityOrder.length < 3 && (
                      <button
                        onClick={handleAddPriority}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                        type="button"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {priorityOrder.map((priority, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex items-center justify-center rounded bg-muted text-xs font-semibold w-6 h-6">
                          {index + 1}
                        </div>
                        <Select
                          value={priority}
                          onValueChange={(value) =>
                            handlePriorityChange(index, value as PriorityFactor)
                          }
                        >
                          <SelectTrigger className="text-xs flex-1 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="availability">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3" />
                                Availability
                              </div>
                            </SelectItem>
                            <SelectItem value="distance">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                Distance
                              </div>
                            </SelectItem>
                            <SelectItem value="score">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-3 w-3" />
                                Overall Score
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {priorityOrder.length > 1 && (
                          <button
                            onClick={() => handleRemovePriority(index)}
                            className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            type="button"
                            aria-label="Remove priority"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Ranked Technicians Content */}
          <CardContent
            className={`relative flex-1 p-0! min-h-0 overflow-hidden flex flex-col ${
              fullScreen ? "py-4 px-4 md:px-0!" : ""
            }`}
          >
            {jobForRankings && (
              <div className="flex-1 min-h-0">
                <ScrollArea
                  key={`technician-list-${jobForRankings?.id || "none"}`}
                  className="h-full"
                >
                  <div className="space-y-0">
                    {/* Priority Controls */}
                    <div className="bg-background py-4 px-4 md:px-0! md:block hidden">
                      <div className="space-y-3">
                        {/* Priority Controls */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Small className="text-xs font-semibold text-muted-foreground">
                              Sort Priority
                            </Small>
                            {priorityOrder.length < 3 && (
                              <button
                                onClick={handleAddPriority}
                                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                                type="button"
                              >
                                <Plus className="h-3 w-3" />
                                Add
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {priorityOrder.map((priority, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <div className="flex items-center justify-center rounded bg-muted text-xs font-semibold w-6 h-6">
                                  {index + 1}
                                </div>
                                <Select
                                  value={priority}
                                  onValueChange={(value) =>
                                    handlePriorityChange(
                                      index,
                                      value as PriorityFactor
                                    )
                                  }
                                >
                                  <SelectTrigger className="text-xs flex-1 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="availability">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Availability
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="distance">
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-3 w-3" />
                                        Distance
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="score">
                                      <div className="flex items-center gap-2">
                                        <TrendingUp className="h-3 w-3" />
                                        Overall Score
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {priorityOrder.length > 1 && (
                                  <button
                                    onClick={() => handleRemovePriority(index)}
                                    className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    type="button"
                                    aria-label="Remove priority"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Technician List */}
                    <div className="py-4 px-4 md:px-0! space-y-3">
                      {rankedTechnicians.length === 0 ? (
                        <div className="text-center py-8">
                          <Muted>No technicians available</Muted>
                        </div>
                      ) : (
                        rankedTechnicians.map((ranking) => {
                          const isSelected =
                            selectedProviderId === ranking.provider.userId;
                          const isAssigning =
                            assigningId === ranking.provider.userId;

                          return (
                            <ProviderCardMinimal
                              key={ranking.provider.userId}
                              technician={ranking.provider}
                              ranking={ranking.factors}
                              score={ranking.score}
                              recommended={ranking.recommended}
                              selected={isSelected}
                              isAssigning={isAssigning}
                              allowOverride={canOverrideAvailability}
                              onClick={() =>
                                setSelectedProviderId(ranking.provider.userId)
                              }
                              onCollapse={() => {
                                // Only reset if this technician was selected
                                if (
                                  selectedProviderId === ranking.provider.userId
                                ) {
                                  setSelectedProviderId(null);
                                }
                              }}
                              onAssign={() =>
                                handleAssign(
                                  ranking.provider.userId,
                                  ranking.score
                                )
                              }
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </>
      )}
    </>
  );

  const mapContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 size-full">
      {/* Map - takes most of the space on desktop, small on mobile */}
      <div
        className={`${
          useIsMobile() ? "col-span-1" : "md:col-span-3"
        } overflow-hidden ${fullScreen ? "" : "rounded-md"}`}
      >
        <MapView
          jobs={mapJobs}
          technicians={mapTechnicians}
          selectedJob={
            sidebarView === "rankings" ? jobForRankings : selectedJob
          }
          selectedTechnician={
            sidebarView === "rankings" && selectedProviderId
              ? mapTechnicians.find((p) => p.id === selectedProviderId) || null
              : null
          }
          disablePopovers={useIsMobile()}
        />
      </div>

      {/* Sidebar - Drawer on mobile, Card on desktop */}
      {useIsMobile() ? (
        <>
          {/* Mobile: Drawer Button */}
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className="fixed bottom-[calc(var(--dock-h)+0.5rem)] right-2 z-50 rounded-full size-12 p-0"
              >
                <Eye className="size-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[90vh]">
              {/* <DrawerHeader> */}
              <DrawerTitle className="sr-only">
                {sidebarView === "pending"
                  ? isDispatcherView
                    ? "Pending Assignments"
                    : "Pending Jobs"
                  : "Ranked Technicians"}
              </DrawerTitle>
              {/* </DrawerHeader> */}
              <div className="overflow-y-auto size-full">
                <Card className="border-0 shadow-none">
                  {pendingAssignmentsContent}
                </Card>
              </div>
            </DrawerContent>
          </Drawer>
        </>
      ) : (
        <Card
          className={`relative col-span-1 bg-background md:border-l border-t md:border-t-0 border-border flex flex-col shrink-0 rounded-none border-x-0! border-b-0! gap-0 flex-1 min-h-0 h-full overflow-hidden ${
            fullScreen ? "md:p-0! md:pr-4!" : ""
          }`}
        >
          {pendingAssignmentsContent}
        </Card>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={`${
          className || "size-full"
        } overflow-hidden flex flex-col h-full`}
      >
        {mapContent}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={className || "md:h-[600px] h-[90vh]"}
    >
      {/* <Card className="relative h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden gap-0 flex flex-col">
        <CardContent className="flex-1 flex overflow-hidden p-0!"> */}
      {mapContent}
      {/* </CardContent>
      </Card> */}
    </motion.div>
  );
}
