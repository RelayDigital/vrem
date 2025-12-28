"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, X, ExternalLink, Briefcase, Building2, MessageSquare, CheckCircle, GraduationCap, RotateCcw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { NotificationItem, NotificationType } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useTour, TRACK_METADATA } from "@/context/tour-context";

interface NotificationBellProps {
  className?: string;
}

// Grouped notification for multiple messages in the same project
interface GroupedMessageNotification {
  type: "GROUPED_MESSAGES";
  projectId: string;
  projectAddress?: string;
  notifications: NotificationItem[];
  messageCount: number;
  unreadCount: number;
  latestNotification: NotificationItem;
}

type DisplayNotification = NotificationItem | GroupedMessageNotification;

function isGroupedNotification(n: DisplayNotification): n is GroupedMessageNotification {
  return (n as GroupedMessageNotification).type === "GROUPED_MESSAGES";
}

export function NotificationBell({ className }: NotificationBellProps) {
  const router = useRouter();
  const { activeOrganizationId, switchOrganization, user, memberships } = useAuth();
  const {
    status: tourStatus,
    getOverallProgress,
    resetProgress: resetTourProgress,
    dismissGuide: dismissTourGuide,
    refetchStatus: refetchTourStatus,
  } = useTour();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isResettingTour, setIsResettingTour] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.notifications.list();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch notifications on mount and when dropdown opens
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refetch when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchNotifications();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchNotifications]);

  const handleAcceptInvitation = async (notification: NotificationItem) => {
    if (!notification.invitationId) return;
    
    setProcessingIds((prev) => new Set(prev).add(notification.id));
    try {
      await api.invitations.accept(notification.invitationId);
      // Remove from list after accepting
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      // Refresh the page to update memberships
      window.location.reload();
    } catch (error) {
      console.error("Failed to accept invitation:", error);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const handleDeclineInvitation = async (notification: NotificationItem) => {
    if (!notification.invitationId) return;
    
    setProcessingIds((prev) => new Set(prev).add(notification.id));
    try {
      await api.invitations.decline(notification.invitationId);
      // Remove from list after declining
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    } catch (error) {
      console.error("Failed to decline invitation:", error);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const handleViewOrganization = async (notification: NotificationItem) => {
    // Navigate to a public org view page
    router.push(`/organization/${notification.orgId}/preview`);
    setIsOpen(false);
  };

  const handleViewProject = async (notification: NotificationItem) => {
    if (!notification.projectId) return;

    // Mark as read
    try {
      await api.notifications.markRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, readAt: new Date() } : n
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }

    // Switch organization if needed
    if (notification.orgId && notification.orgId !== activeOrganizationId) {
      switchOrganization(notification.orgId);
    }

    // Build URL with query params for chat tab
    let url = `/jobs/${notification.projectId}`;
    const params = new URLSearchParams();

    // If it's a message notification, open the chat and set the correct tab
    if (notification.type === "NEW_MESSAGE") {
      params.set("tab", "discussion");
      if (notification.messageChannel) {
        params.set("chat", notification.messageChannel === "CUSTOMER" ? "client" : "team");
      }
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    // Navigate to project
    router.push(url);
    setIsOpen(false);
  };

  const handleViewGroupedProject = async (grouped: GroupedMessageNotification) => {
    // Mark all notifications in the group as read
    try {
      await Promise.all(
        grouped.notifications
          .filter((n) => !n.readAt)
          .map((n) => api.notifications.markRead(n.id))
      );
      setNotifications((prev) =>
        prev.map((n) =>
          grouped.notifications.some((gn) => gn.id === n.id)
            ? { ...n, readAt: new Date() }
            : n
        )
      );
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }

    // Switch organization if needed (use org from latest notification)
    const orgId = grouped.latestNotification.orgId;
    if (orgId && orgId !== activeOrganizationId) {
      switchOrganization(orgId);
    }

    // Build URL - open to discussion tab for message notifications
    let url = `/jobs/${grouped.projectId}`;
    const params = new URLSearchParams();
    params.set("tab", "discussion");

    // Determine which chat tab to open (prefer the one with most recent unread)
    const latestChannel = grouped.latestNotification.messageChannel;
    if (latestChannel) {
      params.set("chat", latestChannel === "CUSTOMER" ? "client" : "team");
    }

    url += `?${params.toString()}`;

    // Navigate to project
    router.push(url);
    setIsOpen(false);
  };

  // Group NEW_MESSAGE notifications by project
  const displayNotifications = useMemo((): DisplayNotification[] => {
    const messagesByProject = new Map<string, NotificationItem[]>();
    const otherNotifications: NotificationItem[] = [];

    for (const notification of notifications) {
      if (notification.type === "NEW_MESSAGE" && notification.projectId) {
        const existing = messagesByProject.get(notification.projectId) || [];
        existing.push(notification);
        messagesByProject.set(notification.projectId, existing);
      } else {
        otherNotifications.push(notification);
      }
    }

    const result: DisplayNotification[] = [...otherNotifications];

    // Create grouped notifications for projects with messages
    for (const [projectId, projectNotifications] of messagesByProject) {
      if (projectNotifications.length === 1) {
        // Single message - show as regular notification
        result.push(projectNotifications[0]);
      } else {
        // Multiple messages - group them
        const sorted = projectNotifications.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const latest = sorted[0];
        result.push({
          type: "GROUPED_MESSAGES",
          projectId,
          projectAddress: latest.projectAddress,
          notifications: projectNotifications,
          messageCount: projectNotifications.length,
          unreadCount: projectNotifications.filter((n) => !n.readAt).length,
          latestNotification: latest,
        });
      }
    }

    // Sort by most recent
    return result.sort((a, b) => {
      const dateA = isGroupedNotification(a)
        ? new Date(a.latestNotification.createdAt).getTime()
        : new Date(a.createdAt).getTime();
      const dateB = isGroupedNotification(b)
        ? new Date(b.latestNotification.createdAt).getTime()
        : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [notifications]);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "PROJECT_ASSIGNED":
        return <Briefcase className="h-4 w-4 text-blue-500" />;
      case "NEW_MESSAGE":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "PROJECT_APPROVED":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      default:
        return <Building2 className="h-4 w-4 text-purple-500" />;
    }
  };

  const getNotificationTitle = (notification: NotificationItem) => {
    switch (notification.type) {
      case "INVITATION_MEMBER":
        return `Invited to join ${notification.orgName}`;
      case "INVITATION_CUSTOMER":
        return `Invited as customer of ${notification.orgName}`;
      case "PROJECT_ASSIGNED":
        return `Assigned to project`;
      case "NEW_MESSAGE":
        return `New message in project`;
      case "PROJECT_APPROVED":
        return `Project approved`;
      default:
        return "Notification";
    }
  };

  const getNotificationDescription = (notification: NotificationItem) => {
    switch (notification.type) {
      case "INVITATION_MEMBER":
        return notification.role
          ? `Role: ${notification.role}`
          : `Join as a team member`;
      case "INVITATION_CUSTOMER":
        return `Become a customer of this organization`;
      case "PROJECT_ASSIGNED":
        const roleLabel = notification.assignedRole
          ? notification.assignedRole.replace("_", " ").toLowerCase()
          : "team member";
        return notification.projectAddress
          ? `As ${roleLabel} at ${notification.projectAddress}`
          : `As ${roleLabel}`;
      case "NEW_MESSAGE":
        const channelLabel = notification.messageChannel === "CUSTOMER" ? "Customer" : "Team";
        const projectInfo = notification.projectAddress || (notification.projectId ? `Project ${notification.projectId.substring(0, 8)}...` : '');
        if (notification.messagePreview) {
          // Strip HTML tags and decode entities for plain text display
          const plainText = notification.messagePreview
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
            .replace(/&amp;/g, '&')  // Decode ampersands
            .replace(/&lt;/g, '<')   // Decode less than
            .replace(/&gt;/g, '>')   // Decode greater than
            .replace(/&quot;/g, '"') // Decode quotes
            .replace(/&#39;/g, "'")  // Decode apostrophes
            .trim();
          const truncated = plainText.substring(0, 50);
          const projectPrefix = projectInfo ? `${projectInfo} • ` : '';
          return `${projectPrefix}${channelLabel}: "${truncated}${plainText.length > 50 ? '...' : ''}"`;
        }
        return projectInfo
          ? `${projectInfo} • New message in ${channelLabel} channel`
          : `New message in ${channelLabel} channel`;
      case "PROJECT_APPROVED":
        return notification.approverName
          ? `Approved by ${notification.approverName}${notification.projectAddress ? ` - ${notification.projectAddress}` : ''}`
          : notification.projectAddress || 'Project delivery approved';
      default:
        return "";
    }
  };

  const isInvitation = (type: NotificationType) =>
    type === "INVITATION_MEMBER" || type === "INVITATION_CUSTOMER";

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  // Tour progress
  const tourProgress = getOverallProgress();
  const isTourComplete = tourStatus?.hasCompletedSetup ?? false;
  const isTourDismissed = tourStatus?.dismissedGuide ?? false;
  // Show tour section if not dismissed (even if complete, so user can restart)
  // COMPANY accounts have human 1-1 onboarding, so don't show the tour in notifications
  const isCompanyAccount = user?.accountType?.toUpperCase() === "COMPANY";
  const showTourSection = !isTourDismissed && !isCompanyAccount;

  // Find the personal workspace organization
  const personalOrg = useMemo(() => {
    return memberships.find(
      (m) =>
        m.organization?.type === "PERSONAL" ||
        (m.organization as any)?.type === "PERSONAL"
    );
  }, [memberships]);

  // Switch to personal workspace and navigate to dashboard, then scroll to setup guide
  const switchToPersonalAndNavigate = useCallback(() => {
    if (personalOrg?.orgId && personalOrg.orgId !== activeOrganizationId) {
      switchOrganization(personalOrg.orgId);
    }
    router.push('/dashboard');

    // Scroll to setup guide after navigation and page render
    setTimeout(() => {
      const setupGuide = document.querySelector('[data-tour="setup-guide"]');
      if (setupGuide) {
        setupGuide.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 500);
  }, [personalOrg, activeOrganizationId, switchOrganization, router]);

  const handleRestartTour = async () => {
    setIsResettingTour(true);
    try {
      await resetTourProgress();
      await refetchTourStatus();
      setIsOpen(false);
      switchToPersonalAndNavigate();
    } catch (error) {
      console.error("Failed to reset tour:", error);
    } finally {
      setIsResettingTour(false);
    }
  };

  const handleDismissTour = async () => {
    try {
      await dismissTourGuide();
      await refetchTourStatus();
    } catch (error) {
      console.error("Failed to dismiss tour:", error);
    }
  };

  const handleContinueTour = () => {
    setIsOpen(false);
    switchToPersonalAndNavigate();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {/* Tour Progress Section */}
        {showTourSection && (
          <>
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Setup Guide</span>
                {isTourComplete && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Complete
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-6 w-6 p-0", isTourComplete ? "" : "ml-auto")}
                  onClick={handleDismissTour}
                  title="Dismiss guide"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {!isTourComplete && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Progress value={tourProgress.percentage} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {tourProgress.completed}/{tourProgress.total}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs"
                    onClick={handleContinueTour}
                  >
                    Continue Setup
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </>
              )}
              {isTourComplete && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 h-8 text-xs"
                    onClick={handleRestartTour}
                    disabled={isResettingTour}
                  >
                    {isResettingTour ? (
                      <Spinner className="h-3 w-3 mr-1" />
                    ) : (
                      <RotateCcw className="h-3 w-3 mr-1" />
                    )}
                    Restart Guide
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                You can always restart the guide from Settings.
              </p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuLabel className="font-semibold">
          Notifications
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : displayNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">All caught up!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="flex flex-col">
              {displayNotifications.map((item) => {
                // Handle grouped message notifications
                if (isGroupedNotification(item)) {
                  const projectInfo = item.projectAddress || `Project ${item.projectId.substring(0, 8)}...`;
                  return (
                    <div
                      key={`grouped-${item.projectId}`}
                      className={cn(
                        "flex flex-col gap-2 p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors",
                        item.unreadCount > 0 && "bg-muted/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <MessageSquare className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium leading-tight">
                              {item.messageCount} new messages
                            </p>
                            {item.unreadCount > 0 && (
                              <Badge variant="secondary" className="h-5 text-xs px-1.5">
                                {item.unreadCount} unread
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {projectInfo}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(item.latestNotification.createdAt, {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-7">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleViewGroupedProject(item)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Project
                        </Button>
                      </div>
                    </div>
                  );
                }

                // Handle regular notifications
                const notification = item;
                const isProcessing = processingIds.has(notification.id);

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex flex-col gap-2 p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors",
                      !notification.readAt && "bg-muted/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {getNotificationTitle(notification)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {getNotificationDescription(notification)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(notification.createdAt, {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-7">
                      {isInvitation(notification.type) ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs"
                            onClick={() => handleAcceptInvitation(notification)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Spinner className="h-3 w-3" />
                            ) : (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Accept
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleDeclineInvitation(notification)}
                            disabled={isProcessing}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => handleViewOrganization(notification)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleViewProject(notification)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Project
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

