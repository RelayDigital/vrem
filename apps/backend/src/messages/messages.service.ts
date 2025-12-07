import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser, OrgContext, buildOrgContext } from '../auth/auth-context';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ProjectChatChannel } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private authorization: AuthorizationService,
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
   */
  async userHasAccessToProject(
    user: AuthenticatedUser,
    projectId: string,
    channel: 'team' | 'customer' = 'team',
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { organization: true, technician: true, editor: true, projectManager: true },
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

    // All org members can READ both channels
    // For WRITE access to customer chat, check canWriteCustomerChat
    if (channel === 'customer') {
      // For subscription purposes, check read access (all org members can read)
      return this.authorization.canReadCustomerChat(ctx, project as any);
    }

    return this.authorization.canReadTeamChat(ctx, project as any);
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
      include: { organization: true, technician: true, editor: true, projectManager: true },
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
    
    if (!this.authorization.canViewProject(ctx, project)) {
      throw new ForbiddenException('You are not allowed to view messages');
    }

    // All org members can READ both team and customer chat
    // Determine which channels to return based on request and read permissions
    const canReadTeam = this.authorization.canReadTeamChat(ctx, project);
    const canReadCustomer = this.authorization.canReadCustomerChat(ctx, project);

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
    
    if (!this.authorization.canViewProject(ctx, project)) {
      throw new ForbiddenException('You are not allowed to view this message');
    }
    
    // Check read permission based on channel
    if (message.channel === ProjectChatChannel.CUSTOMER) {
      if (!this.authorization.canReadCustomerChat(ctx, project)) {
        throw new ForbiddenException('You are not allowed to view this message');
      }
    } else {
      if (!this.authorization.canReadTeamChat(ctx, project)) {
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

    if (!this.authorization.canViewProject(ctx, project)) {
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
      if (!this.authorization.canWriteTeamChat(ctx, project)) {
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
}
