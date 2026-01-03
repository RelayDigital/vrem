import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth-context';
import { NotificationResponseDto } from './dto/notification-response.dto';
import {
  NotificationType,
  InvitationStatus,
  InvitationType,
  OrgRole,
  OrgType,
} from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all notifications for the current user.
   * Combines pending invitations and unread project assignment notifications.
   */
  async getNotificationsForUser(
    user: AuthenticatedUser,
  ): Promise<NotificationResponseDto[]> {
    const notifications: NotificationResponseDto[] = [];

    // 1. Get pending invitations for this user's email
    const pendingInvitations = await this.prisma.invitation.findMany({
      where: {
        email: user.email,
        status: InvitationStatus.PENDING,
      },
      include: {
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const invitation of pendingInvitations) {
      const notificationType =
        invitation.inviteType === InvitationType.CUSTOMER
          ? NotificationType.INVITATION_CUSTOMER
          : NotificationType.INVITATION_MEMBER;

      notifications.push({
        id: `inv-${invitation.id}`,
        type: notificationType,
        orgId: invitation.orgId,
        orgName: invitation.organization.name,
        orgType: invitation.organization.type,
        createdAt: invitation.createdAt,
        invitationId: invitation.id,
        role: invitation.role,
      });
    }

    // 2. Get unread notifications (various project-related types)
    const projectNotifications = await this.prisma.notification.findMany({
      where: {
        userId: user.id,
        type: {
          in: [
            NotificationType.PROJECT_ASSIGNED,
            NotificationType.NEW_MESSAGE,
            NotificationType.PROJECT_APPROVED,
            NotificationType.PROJECT_DELIVERED,
            NotificationType.CHANGES_REQUESTED,
            NotificationType.DELIVERY_COMMENT,
          ],
        },
        readAt: null,
        orgId: { not: null }, // Only include notifications with an org
      },
      include: {
        organization: true,
        project: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const notification of projectNotifications) {
      // Skip notifications without organization (shouldn't happen but handle gracefully)
      if (!notification.organization) continue;

      const payload = notification.payload as Record<string, any> | null;
      const projectAddress = this.buildProjectAddress(notification.project);

      notifications.push({
        id: notification.id,
        type: notification.type,
        orgId: notification.orgId || '',
        orgName: notification.organization.name,
        orgType: notification.organization.type,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
        projectId: notification.projectId || undefined,
        projectAddress,
        assignedRole: payload?.role,
        messagePreview: payload?.preview,
        messageChannel: payload?.channel,
        approverName: payload?.approverName,
        deliveryToken: payload?.deliveryToken,
      });
    }

    // Sort all notifications by createdAt descending
    notifications.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    return notifications;
  }

  /**
   * Accept an invitation.
   */
  async acceptInvitation(
    invitationId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { organization: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('This invitation is not for you');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ForbiddenException('This invitation has already been processed');
    }

    // Handle based on invite type
    if (invitation.inviteType === InvitationType.CUSTOMER) {
      // First, check if there's an existing OrganizationCustomer by email (created when company added customer)
      // This is the record that may already be linked to projects
      const existingCustomerByEmail =
        await this.prisma.organizationCustomer.findFirst({
          where: {
            orgId: invitation.orgId,
            email: { equals: user.email, mode: 'insensitive' },
          },
        });

      if (existingCustomerByEmail) {
        // Update the existing record to link the userId
        // This preserves the connection to any existing projects
        await this.prisma.organizationCustomer.update({
          where: { id: existingCustomerByEmail.id },
          data: {
            userId: user.id,
            name: user.name, // Update name to match user's actual name
          },
        });
      } else {
        // Check if there's already a customer record with this userId
        const existingCustomerByUserId =
          await this.prisma.organizationCustomer.findFirst({
            where: {
              orgId: invitation.orgId,
              userId: user.id,
            },
          });

        if (!existingCustomerByUserId) {
          // Create new OrganizationCustomer record
          await this.prisma.organizationCustomer.create({
            data: {
              orgId: invitation.orgId,
              userId: user.id,
              name: user.name,
              email: user.email,
            },
          });
        }
      }
    } else {
      // Create OrganizationMember record
      const existingMember = await this.prisma.organizationMember.findFirst({
        where: {
          userId: user.id,
          orgId: invitation.orgId,
        },
      });

      if (!existingMember) {
        await this.prisma.organizationMember.create({
          data: {
            userId: user.id,
            orgId: invitation.orgId,
            role: invitation.role,
          },
        });
      }
    }

    // Mark invitation as accepted
    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.ACCEPTED,
        accepted: true,
      },
    });
  }

  /**
   * Decline an invitation.
   */
  async declineInvitation(
    invitationId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('This invitation is not for you');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ForbiddenException('This invitation has already been processed');
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.DECLINED,
      },
    });
  }

  /**
   * Mark a notification as read.
   */
  async markNotificationAsRead(
    notificationId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== user.id) {
      throw new ForbiddenException('This notification does not belong to you');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for the current user.
   */
  async markAllNotificationsAsRead(user: AuthenticatedUser): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { count: result.count };
  }

  /**
   * Get unread notification count for the current user.
   */
  async getUnreadCount(user: AuthenticatedUser): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: {
        userId: user.id,
        readAt: null,
      },
    });

    // Also count pending invitations
    const pendingInvitations = await this.prisma.invitation.count({
      where: {
        email: user.email,
        status: InvitationStatus.PENDING,
      },
    });

    return { count: count + pendingInvitations };
  }

  /**
   * Get public organization info for viewing from an invitation.
   */
  async getOrganizationPublicInfo(
    orgId: string,
    user: AuthenticatedUser,
  ): Promise<{
    id: string;
    name: string;
    type: OrgType;
    logoUrl?: string;
    websiteUrl?: string;
    city?: string;
    region?: string;
  }> {
    // Check if user has a pending invitation to this org
    const hasInvitation = await this.prisma.invitation.findFirst({
      where: {
        orgId,
        email: user.email,
        status: InvitationStatus.PENDING,
      },
    });

    // Or if user is already a member/customer
    const isMember = await this.prisma.organizationMember.findFirst({
      where: { orgId, userId: user.id },
    });

    const isCustomer = await this.prisma.organizationCustomer.findFirst({
      where: { orgId, userId: user.id },
    });

    if (!hasInvitation && !isMember && !isCustomer) {
      throw new ForbiddenException(
        'You do not have access to view this organization',
      );
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return {
      id: org.id,
      name: org.name,
      type: org.type,
      logoUrl: org.logoUrl || undefined,
      websiteUrl: org.websiteUrl || undefined,
      city: org.city || undefined,
      region: org.region || undefined,
    };
  }

  /**
   * Create a project assignment notification.
   * Called when a user is assigned to a project.
   */
  async createProjectAssignmentNotification(
    userId: string,
    projectId: string,
    orgId: string,
    role: 'TECHNICIAN' | 'EDITOR' | 'PROJECT_MANAGER' | 'CUSTOMER',
    projectAddress?: string,
    projectStatus?: string,
  ): Promise<void> {
    // Check if notification already exists for this user/project/role combo
    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        userId,
        projectId,
        type: NotificationType.PROJECT_ASSIGNED,
        payload: {
          path: ['role'],
          equals: role,
        },
      },
    });

    if (existingNotification) {
      // Already notified for this assignment
      return;
    }

    await this.prisma.notification.create({
      data: {
        userId,
        orgId,
        projectId,
        type: NotificationType.PROJECT_ASSIGNED,
        payload: {
          role,
          address: projectAddress,
          status: projectStatus,
        },
      },
    });
  }

  /**
   * Create notifications for a new message.
   * Notifies project watchers based on channel visibility.
   */
  async createMessageNotifications(
    senderId: string,
    projectId: string,
    orgId: string,
    channel: 'TEAM' | 'CUSTOMER',
    messageId: string,
    preview: string,
  ): Promise<void> {
    // Get project with assignments
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        customer: true,
        technician: true,
        editor: true,
        projectManager: true,
        organization: {
          include: {
            members: {
              where: {
                role: { in: ['OWNER', 'ADMIN'] },
              },
            },
          },
        },
      },
    });

    if (!project) return;

    const watcherIds = new Set<string>();

    // TEAM channel: notify technician, editor, PM, OWNER/ADMIN
    if (channel === 'TEAM') {
      if (project.technicianId) watcherIds.add(project.technicianId);
      if (project.editorId) watcherIds.add(project.editorId);
      if (project.projectManagerId) watcherIds.add(project.projectManagerId);
      project.organization.members.forEach((m) => watcherIds.add(m.userId));
    }

    // CUSTOMER channel: notify PM, OWNER/ADMIN, and customer
    if (channel === 'CUSTOMER') {
      if (project.projectManagerId) watcherIds.add(project.projectManagerId);
      project.organization.members.forEach((m) => watcherIds.add(m.userId));
      if (project.customer?.userId) watcherIds.add(project.customer.userId);
    }

    // Don't notify the sender
    watcherIds.delete(senderId);

    // Create notifications with deduplication by messageId
    for (const userId of watcherIds) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId,
          projectId,
          type: NotificationType.NEW_MESSAGE,
          messageId,
        },
      });

      if (!existing) {
        await this.prisma.notification.create({
          data: {
            userId,
            orgId,
            projectId,
            type: NotificationType.NEW_MESSAGE,
            messageId,
            payload: {
              channel,
              preview: preview.substring(0, 100),
            },
          },
        });
      }
    }
  }

  /**
   * Create notification when a project is delivered to customer.
   * Notifies the linked customer (agent) that their job is ready.
   */
  async createDeliveryNotification(
    projectId: string,
    orgId: string,
    deliveryToken: string,
  ): Promise<void> {
    // Get project with customer
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        customer: true,
        organization: true,
      },
    });

    if (!project) return;

    // Only notify if there's a linked customer user
    if (!project.customer?.userId) return;

    const userId = project.customer.userId;

    // Check if notification already exists for this delivery
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId,
        projectId,
        type: NotificationType.PROJECT_DELIVERED,
      },
    });

    if (existing) {
      // Already notified for this delivery - don't duplicate
      return;
    }

    await this.prisma.notification.create({
      data: {
        userId,
        orgId,
        projectId,
        type: NotificationType.PROJECT_DELIVERED,
        payload: {
          address: this.buildProjectAddress(project),
          organizationName: project.organization.name,
          deliveryToken,
        },
      },
    });
  }

  /**
   * Create notifications when a project is approved by customer.
   * Notifies ops team (PM, OWNER/ADMIN).
   */
  async createApprovalNotifications(
    projectId: string,
    orgId: string,
    approverId: string,
    approverName: string,
  ): Promise<void> {
    // Get project with org members
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: {
          include: {
            members: {
              where: {
                role: { in: ['OWNER', 'ADMIN', 'PROJECT_MANAGER'] },
              },
            },
          },
        },
      },
    });

    if (!project) return;

    const watcherIds = new Set<string>();
    if (project.projectManagerId) watcherIds.add(project.projectManagerId);
    project.organization.members.forEach((m) => watcherIds.add(m.userId));

    // Don't notify the approver
    watcherIds.delete(approverId);

    for (const userId of watcherIds) {
      await this.prisma.notification.create({
        data: {
          userId,
          orgId,
          projectId,
          type: NotificationType.PROJECT_APPROVED,
          payload: {
            approverName,
            address: this.buildProjectAddress(project),
          },
        },
      });
    }
  }

  /**
   * Create notifications when a customer requests changes on delivery.
   * Notifies ops team (PM, OWNER/ADMIN, technician, editor).
   */
  async createChangesRequestedNotifications(
    projectId: string,
    orgId: string,
    requesterId: string,
    requesterName: string,
    comment?: string,
  ): Promise<void> {
    // Get project with org members
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: {
          include: {
            members: {
              where: {
                role: { in: ['OWNER', 'ADMIN', 'PROJECT_MANAGER'] },
              },
            },
          },
        },
      },
    });

    if (!project) return;

    const watcherIds = new Set<string>();
    if (project.projectManagerId) watcherIds.add(project.projectManagerId);
    if (project.technicianId) watcherIds.add(project.technicianId);
    if (project.editorId) watcherIds.add(project.editorId);
    project.organization.members.forEach((m) => watcherIds.add(m.userId));

    // Don't notify the requester
    watcherIds.delete(requesterId);

    for (const userId of watcherIds) {
      await this.prisma.notification.create({
        data: {
          userId,
          orgId,
          projectId,
          type: NotificationType.CHANGES_REQUESTED,
          title: 'Changes requested',
          body: comment ? comment.substring(0, 200) : undefined,
          entityType: 'project',
          entityId: projectId,
          payload: {
            requesterName,
            address: this.buildProjectAddress(project),
            comment: comment?.substring(0, 200),
          },
        },
      });
    }
  }

  /**
   * Create notifications for a new delivery comment.
   * Notifies project watchers (agent/customer and ops team).
   */
  async createDeliveryCommentNotifications(
    projectId: string,
    orgId: string,
    senderId: string,
    senderName: string,
    commentPreview: string,
    isFromCustomer: boolean,
  ): Promise<void> {
    // Get project with assignments
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        customer: true,
        organization: {
          include: {
            members: {
              where: {
                role: { in: ['OWNER', 'ADMIN', 'PROJECT_MANAGER'] },
              },
            },
          },
        },
      },
    });

    if (!project) return;

    const watcherIds = new Set<string>();

    if (isFromCustomer) {
      // Customer commented - notify ops team
      if (project.projectManagerId) watcherIds.add(project.projectManagerId);
      if (project.technicianId) watcherIds.add(project.technicianId);
      if (project.editorId) watcherIds.add(project.editorId);
      project.organization.members.forEach((m) => watcherIds.add(m.userId));
    } else {
      // Ops team commented - notify customer
      if (project.customer?.userId) watcherIds.add(project.customer.userId);
    }

    // Don't notify the sender
    watcherIds.delete(senderId);

    for (const userId of watcherIds) {
      await this.prisma.notification.create({
        data: {
          userId,
          orgId,
          projectId,
          type: NotificationType.DELIVERY_COMMENT,
          title: 'New delivery comment',
          body: commentPreview.substring(0, 100),
          entityType: 'project',
          entityId: projectId,
          payload: {
            senderName,
            preview: commentPreview.substring(0, 100),
            address: this.buildProjectAddress(project),
          },
        },
      });
    }
  }

  private buildProjectAddress(
    project: {
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      region?: string | null;
      postalCode?: string | null;
    } | null,
  ): string | undefined {
    if (!project) return undefined;

    const parts = [
      project.addressLine1,
      project.addressLine2,
      project.city,
      project.region,
      project.postalCode,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : undefined;
  }
}

