import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuthorizationService } from '../auth/authorization.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser, OrgContext, buildOrgContext } from '../auth/auth-context';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ProjectChatChannel } from '@prisma/client';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private authorization: AuthorizationService,
    private notifications: NotificationsService,
  ) {}

  private async loadProject(projectId: string, ctx: OrgContext) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId: ctx.org.id },
      include: {
        technician: true,
        editor: true,
        projectManager: true,
        customer: true,
      },
    });

    if (!project) {
      throw new ForbiddenException('Project does not belong to your organization');
    }

    return project;
  }

  /**
   * Check if user has access to a project's messages.
   * Used for WebSocket/real-time message subscriptions.
   * 
   * - EDITOR/TECHNICIAN cannot access customer chat
   * - EDITOR/TECHNICIAN can only access team chat for projects they're assigned to
   * - AGENT customers can access customer chat for projects they're linked to
   */
  async userHasAccessToProject(
    user: AuthenticatedUser,
    projectId: string,
    channel: 'team' | 'customer' = 'team',
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { 
        organization: true, 
        technician: true, 
        editor: true, 
        projectManager: true,
        customer: true, // Required for isLinkedCustomer check
      },
    });

    if (!project || !project.organization) return false;

    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id, orgId: project.orgId },
    });

    const ctx = buildOrgContext({
      user,
      org: project.organization,
      membership,
    });

    // Use canPostMessage which handles both read/write and agent customer access
    return this.authorization.canPostMessage(ctx, project as any, channel, user);
  }

  /**
   * Check if user can write to a specific channel.
   * Used for WebSocket/real-time message sending validation.
   */
  async userCanWriteToChannel(
    user: AuthenticatedUser,
    projectId: string,
    channel: 'team' | 'customer',
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { 
        organization: true, 
        technician: true, 
        editor: true, 
        projectManager: true,
        customer: true, // Required for isLinkedCustomer check
      },
    });

    if (!project || !project.organization) return false;

    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id, orgId: project.orgId },
    });

    const ctx = buildOrgContext({
      user,
      org: project.organization,
      membership,
    });

    return this.authorization.canPostMessage(ctx, project as any, channel, user);
  }

  async sendMessage(ctx: OrgContext, user: AuthenticatedUser, dto: SendMessageDto) {
    const project = await this.loadProject(dto.projectId, ctx);

    const channel =
      dto.channel === ProjectChatChannel.CUSTOMER ? 'customer' : 'team';

    if (!this.authorization.canPostMessage(ctx, project, channel, user)) {
      throw new ForbiddenException('You are not allowed to send messages here');
    }

    const thread = dto.thread || null;

    if (thread) {
      const parent = await this.prisma.message.findFirst({
        where: {
          id: thread,
          projectId: dto.projectId,
          channel:
            channel === 'customer'
              ? ProjectChatChannel.CUSTOMER
              : ProjectChatChannel.TEAM,
        },
      });
      if (!parent) {
        throw new ForbiddenException('Parent message not found for this project/channel');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        projectId: dto.projectId,
        userId: user.id,
        content: dto.content,
        channel:
          channel === 'customer'
            ? ProjectChatChannel.CUSTOMER
            : ProjectChatChannel.TEAM,
        thread,
      },
      include: {
        user: true,
      },
    });

    // Create notifications for project watchers
    try {
      await this.notifications.createMessageNotifications(
        user.id,
        dto.projectId,
        project.orgId,
        channel === 'customer' ? 'CUSTOMER' : 'TEAM',
        message.id,
        dto.content,
      );
    } catch (error: any) {
      this.logger.warn(`Failed to create message notifications: ${error.message}`);
    }

    return message;
  }

  async sendMessageWithOrg(user: AuthenticatedUser, dto: SendMessageDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      include: {
        organization: true,
        technician: true,
        editor: true,
        projectManager: true,
        customer: true,
      },
    });

    if (!project || !project.organization) {
      throw new NotFoundException('Project not found');
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id, orgId: project.orgId },
    });

    const ctx = buildOrgContext({
      user,
      org: project.organization,
      membership,
    });

    return this.sendMessage(ctx, user, dto);
  }

  async getMessagesForProject(
    ctx: OrgContext,
    user: AuthenticatedUser,
    projectId: string,
    channel?: ProjectChatChannel,
  ) {
    const project = await this.loadProject(projectId, ctx);
    
    if (!this.authorization.canViewProject(ctx, project, user)) {
      throw new ForbiddenException('You are not allowed to view messages');
    }

    // Determine which channels to return based on request and read permissions
    // EDITOR/TECHNICIAN cannot read customer chat
    const canReadTeam = this.authorization.canReadTeamChat(ctx, project, user);
    const canReadCustomer = this.authorization.canReadCustomerChat(ctx, project, user);

    let channels: ProjectChatChannel[] = [];
    
    if (channel === ProjectChatChannel.CUSTOMER) {
      if (canReadCustomer) {
        channels = [ProjectChatChannel.CUSTOMER];
      } else {
        throw new ForbiddenException('You are not allowed to view customer chat');
      }
    } else if (channel === ProjectChatChannel.TEAM) {
      if (canReadTeam) {
        channels = [ProjectChatChannel.TEAM];
      } else {
        throw new ForbiddenException('You are not allowed to view team chat');
      }
    } else {
      // No specific channel requested - return all readable channels
      if (canReadTeam) channels.push(ProjectChatChannel.TEAM);
      if (canReadCustomer) channels.push(ProjectChatChannel.CUSTOMER);
    }

    if (channels.length === 0) {
      return [];
    }

    return this.prisma.message.findMany({
      where: { projectId, channel: { in: channels } },
      orderBy: { timestamp: 'asc' },
      include: {
        user: true,
      },
    });
  }

  async getMessageById(ctx: OrgContext, user: AuthenticatedUser, id: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!message) throw new NotFoundException('Message not found');
    const project = await this.loadProject(message.projectId, ctx);
    
    if (!this.authorization.canViewProject(ctx, project, user)) {
      throw new ForbiddenException('You are not allowed to view this message');
    }
    
    // Check read permission based on channel
    // EDITOR/TECHNICIAN cannot read customer chat
    if (message.channel === ProjectChatChannel.CUSTOMER) {
      if (!this.authorization.canReadCustomerChat(ctx, project, user)) {
        throw new ForbiddenException('You are not allowed to view this message');
      }
    } else {
      if (!this.authorization.canReadTeamChat(ctx, project, user)) {
        throw new ForbiddenException('You are not allowed to view this message');
      }
    }
    
    return message;
  }

  async deleteMessage(
    id: string,
    ctx: OrgContext,
    currentUser: AuthenticatedUser,
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id },
    });

    if (!message) throw new NotFoundException('Message not found');

    const project = await this.loadProject(message.projectId, ctx);

    if (!this.authorization.canViewProject(ctx, project, currentUser)) {
      throw new ForbiddenException('You are not allowed to delete this message');
    }

    const isOwner = message.userId === currentUser.id;
    // Use canEditProject for moderation rights (respects PM assignment)
    const canModerate = this.authorization.canEditProject(ctx, project, currentUser);
    
    // Check write permission for the channel
    if (message.channel === ProjectChatChannel.CUSTOMER) {
      if (!this.authorization.canWriteCustomerChat(ctx, project, currentUser)) {
        throw new ForbiddenException('You are not allowed to delete this message');
      }
    } else {
      if (!this.authorization.canWriteTeamChat(ctx, project, currentUser)) {
        throw new ForbiddenException('You are not allowed to delete this message');
      }
    }

    // Must be message owner or have moderation rights
    if (!isOwner && !canModerate) {
      throw new ForbiddenException('You are not allowed to delete this message');
    }

    await this.prisma.message.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Mark messages as read by a user.
   * Creates read receipts for the specified messages.
   */
  async markMessagesAsRead(
    userId: string,
    userName: string,
    messageIds: string[],
    projectId: string,
    channel: 'TEAM' | 'CUSTOMER',
  ): Promise<{ messageIds: string[]; userId: string; userName: string; readAt: Date }> {
    // Validate messages belong to the project/channel and are not from this user
    const messages = await this.prisma.message.findMany({
      where: {
        id: { in: messageIds },
        projectId,
        channel,
        userId: { not: userId }, // Don't mark own messages as read
      },
      select: { id: true },
    });

    const validMessageIds = messages.map((m) => m.id);

    if (validMessageIds.length === 0) {
      return { messageIds: [], userId, userName, readAt: new Date() };
    }

    // Create read receipts (upsert to handle duplicates)
    const now = new Date();
    await this.prisma.$transaction(
      validMessageIds.map((messageId) =>
        this.prisma.messageRead.upsert({
          where: {
            messageId_userId: { messageId, userId },
          },
          create: { messageId, userId, readAt: now },
          update: { readAt: now },
        }),
      ),
    );

    return {
      messageIds: validMessageIds,
      userId,
      userName,
      readAt: now,
    };
  }

  /**
   * Get read receipts for a specific message.
   */
  async getMessageReadReceipts(messageId: string): Promise<{ userId: string; userName: string; readAt: Date }[]> {
    const reads = await this.prisma.messageRead.findMany({
      where: { messageId },
      include: { user: { select: { name: true } } },
      orderBy: { readAt: 'asc' },
    });

    return reads.map((r) => ({
      userId: r.userId,
      userName: r.user.name,
      readAt: r.readAt,
    }));
  }
}
