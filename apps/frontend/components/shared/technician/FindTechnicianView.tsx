'use client';

import { useState, useMemo } from 'react';
import { JobRequest, ProviderProfile as Technician, ProviderRanking } from '../../../types';
import { MapView } from '../map/MapView';
import { ProviderCard } from '../../features/provider/ProviderCard';
import { Skeleton } from '../../ui/skeleton';
import { ScrollArea } from '../../ui/scroll-area';
import { Spinner } from '../../ui/spinner';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../ui/select';
import { 
  MapPin, 
  TrendingUp, 
  CheckCircle2,
  Plus,
  X
} from 'lucide-react';
import { H3, Small, Muted } from '../../ui/typography';
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

type PriorityFactor = 'availability' | 'distance' | 'score';

interface FindTechnicianViewProps {
  job: JobRequest;
  technicians: Technician[];
  onAssign: (technicianId: string, score: number) => void;
  preferredVendors?: string[];
  isLoading?: boolean;
  allowOverride?: boolean; // Allow admins to assign unavailable technicians
}

export function FindTechnicianView({
  job,
  technicians,
  onAssign,
  preferredVendors = [],
  isLoading = false,
  allowOverride = false,
}: FindTechnicianViewProps) {
  const [priorityOrder, setPriorityOrder] = useState<PriorityFactor[]>([
    'availability',
    'distance',
    'score',
  ]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);

  // Calculate individual scores for each technician
  const technicianScores = useMemo(() => {
    return technicians
      .filter((p) => p.status === 'active')
      .map((technician) => {
        const distanceKm = calculateDistanceLocal(
          technician.homeLocation.lat,
          technician.homeLocation.lng,
          job.location.lat,
          job.location.lng
        );

        // Check availability
        const availability = technician.availability.find(
          (a) => a.date === job.scheduledDate
        );
        const isAvailable = availability?.available || false;

        // Calculate distance score (0-100)
        let distanceScore = 0;
        if (distanceKm <= 5) distanceScore = 100;
        else if (distanceKm <= 15) distanceScore = 75;
        else if (distanceKm <= 30) distanceScore = 50;
        else if (distanceKm <= 50) distanceScore = 25;

        // Calculate reliability score
        const { onTimeRate, noShows, totalJobs } = technician.reliability;
        let reliabilityScore = 50;
        if (totalJobs > 0) {
          const noShowPenalty = (noShows / totalJobs) * 100;
          reliabilityScore = Math.max(0, Math.min(100, onTimeRate * 100 - noShowPenalty));
        }

        // Calculate skill match score
        const skillMap: Record<string, keyof Technician['skills']> = {
          photo: 'residential',
          video: 'video',
          aerial: 'aerial',
          twilight: 'twilight',
        };
        let totalSkillScore = 0;
        let skillCount = 0;
        for (const mediaType of job.mediaType) {
          const skillKey = skillMap[mediaType];
          if (skillKey && technician.skills[skillKey] !== undefined) {
            totalSkillScore += technician.skills[skillKey];
            skillCount++;
          }
        }
        const skillScore = skillCount > 0 ? (totalSkillScore / skillCount) * 20 : 50;

        // Calculate preferred relationship score
        let preferredScore = 0;
        if (technician.companyId && preferredVendors.includes(technician.companyId)) {
          preferredScore = 100;
        } else if (technician.preferredClients.includes(job.organizationId)) {
          preferredScore = 100;
        }

        // Composite score (using original weights for overall score)
        const overallScore =
          (isAvailable ? 100 : 0) * 0.3 +
          preferredScore * 0.25 +
          reliabilityScore * 0.2 +
          distanceScore * 0.15 +
          skillScore * 0.1;

        return {
          technician,
          isAvailable,
          distanceKm,
          distanceScore,
          reliabilityScore,
          skillScore,
          preferredScore,
          overallScore,
        };
      });
  }, [technicians, job, preferredVendors]);

  // Sort technicians based on priority order
  const rankedTechnicians = useMemo(() => {
    const sorted = [...technicianScores].sort((a, b) => {
      for (const priority of priorityOrder) {
        let comparison = 0;
        
        if (priority === 'availability') {
          // Available technicians first
          comparison = (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0);
        } else if (priority === 'distance') {
          // Closer technicians first
          comparison = a.distanceKm - b.distanceKm;
        } else if (priority === 'score') {
          // Higher scores first
          comparison = b.overallScore - a.overallScore;
        }
        
        if (comparison !== 0) return comparison;
      }
      return 0;
    });

    return sorted.map((item, index) => ({
      provider: item.technician,
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
  }, [technicianScores, priorityOrder]);

  const handleAssign = async (technicianId: string, score: number) => {
    setAssigningId(technicianId);
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      onAssign(technicianId, score);
    } catch (error) {
      console.error('Failed to assign technician:', error);
    } finally {
      setAssigningId(null);
    }
  };

  const handlePriorityChange = (index: number, newPriority: PriorityFactor) => {
    const newOrder = [...priorityOrder];
    // Check if the new priority already exists at a different position
    const currentIndex = newOrder.indexOf(newPriority);
    
    if (currentIndex !== -1 && currentIndex !== index) {
      // Swap: move the existing priority to the target index
      const oldPriority = newOrder[index];
      newOrder[index] = newPriority;
      newOrder[currentIndex] = oldPriority;
    } else {
      // Just update the priority at this index
      newOrder[index] = newPriority;
    }
    
    setPriorityOrder(newOrder);
  };

  const handleAddPriority = () => {
    if (priorityOrder.length >= 3) return;
    
    // Find the first priority that's not already in the list
    const allPriorities: PriorityFactor[] = ['availability', 'distance', 'score'];
    const availablePriority = allPriorities.find(p => !priorityOrder.includes(p));
    
    if (availablePriority) {
      setPriorityOrder([...priorityOrder, availablePriority]);
    }
  };

  const handleRemovePriority = (index: number) => {
    if (priorityOrder.length <= 1) return; // Must keep at least 1
    
    const newOrder = [...priorityOrder];
    newOrder.splice(index, 1);
    setPriorityOrder(newOrder);
  };

  return (
    <div className="flex h-[calc(90vh-120px)] gap-4">
      {/* Map View */}
      <div className="flex-1 relative rounded-lg overflow-hidden border bg-muted/50 h-full">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Spinner className="h-8 w-8 mx-auto text-primary" />
              <Muted>Loading map...</Muted>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0">
          <MapView
            jobs={[job]}
            technicians={rankedTechnicians.map((r) => r.provider)}
            selectedJob={job}
            selectedTechnician={
              selectedTechnicianId
                ? rankedTechnicians.find(
                    (r) => r.provider.id === selectedTechnicianId
                  )?.provider || null
                : null
            }
          />
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-96 flex flex-col border rounded-lg bg-background">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div>
            <H3 className="text-lg border-0">Ranked Technicians</H3>
            <Muted className="text-xs">
              {rankedTechnicians.length} available
            </Muted>
          </div>

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
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-xs font-semibold">
                    {index + 1}
                  </div>
                  <Select
                    value={priority}
                    onValueChange={(value) =>
                      handlePriorityChange(index, value as PriorityFactor)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
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

        {/* Technician List */}
        <ScrollArea className="flex-1 size-full overflow-y-auto">
          <div className="p-4 space-y-3">
            {isLoading ? (
              // Loading Skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-4 space-y-3 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))
            ) : rankedTechnicians.length === 0 ? (
              <div className="text-center py-8">
                <Muted>No technicians available</Muted>
              </div>
            ) : (
              rankedTechnicians.map((ranking) => {
                const technician = (ranking as any).provider || (ranking as any).technician;
                if (!technician) return null;
                const isAssigning = assigningId === technician.id;
                const isSelected = selectedTechnicianId === technician.id;

                return (
                  <div
                    key={technician.id}
                    className={`relative border rounded-lg transition-all ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    } ${isAssigning ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <ProviderCard
                      technician={technician}
                      ranking={ranking.factors}
                      score={ranking.score}
                      recommended={ranking.recommended}
                      showFullAddress={true}
                      allowOverride={allowOverride}
                      onAssign={() => {
                        setSelectedTechnicianId(technician.id);
                        handleAssign(technician.id, ranking.score);
                      }}
                      onClick={() => setSelectedTechnicianId(technician.id)}
                    />
                    {isAssigning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg z-10">
                        <Spinner className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
