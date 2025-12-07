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

    if (channel === 'customer') {
      return this.authorization.canPostMessage(ctx, project as any, 'customer', user);
    }

    return this.authorization.canViewProject(ctx, project as any);
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

    const canViewCustomer = this.authorization.canPostMessage(
      ctx,
      project,
      'customer',
      user,
    );
    const channels =
      channel === ProjectChatChannel.CUSTOMER && canViewCustomer
        ? [ProjectChatChannel.CUSTOMER]
        : channel === ProjectChatChannel.TEAM
        ? [ProjectChatChannel.TEAM]
        : canViewCustomer
        ? [ProjectChatChannel.TEAM, ProjectChatChannel.CUSTOMER]
        : [ProjectChatChannel.TEAM];

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
    if (
      message.channel === ProjectChatChannel.CUSTOMER &&
      !this.authorization.canPostMessage(ctx, project, 'customer', user)
    ) {
      throw new ForbiddenException('You are not allowed to view this message');
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
    const canModerate = this.authorization.canManageProject(ctx, project);
    if (
      message.channel === ProjectChatChannel.CUSTOMER &&
      !this.authorization.canPostMessage(ctx, project, 'customer', currentUser)
    ) {
      throw new ForbiddenException('You are not allowed to delete this message');
    }

    if (!isOwner && !canModerate) {
      throw new ForbiddenException('You are not allowed to delete this message');
    }

    await this.prisma.message.delete({
      where: { id },
    });

    return { success: true };
  }
}
