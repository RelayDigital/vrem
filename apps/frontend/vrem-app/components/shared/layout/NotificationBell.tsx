"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, X, ExternalLink, Briefcase, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

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
    
    // Navigate to project
    router.push(`/jobs/${notification.projectId}`);
    setIsOpen(false);
  };

  const getNotificationIcon = (type: NotificationType) => {
    if (type === "PROJECT_ASSIGNED") {
      return <Briefcase className="h-4 w-4 text-blue-500" />;
    }
    return <Building2 className="h-4 w-4 text-purple-500" />;
  };

  const getNotificationTitle = (notification: NotificationItem) => {
    switch (notification.type) {
      case "INVITATION_MEMBER":
        return `Invited to join ${notification.orgName}`;
      case "INVITATION_CUSTOMER":
        return `Invited as customer of ${notification.orgName}`;
      case "PROJECT_ASSIGNED":
        return `Assigned to project`;
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
      default:
        return "";
    }
  };

  const isInvitation = (type: NotificationType) =>
    type === "INVITATION_MEMBER" || type === "INVITATION_CUSTOMER";

  const unreadCount = notifications.filter((n) => !n.readAt).length;

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
        <DropdownMenuLabel className="font-semibold">
          Notifications
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">All caught up!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="flex flex-col">
              {notifications.map((notification) => {
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

