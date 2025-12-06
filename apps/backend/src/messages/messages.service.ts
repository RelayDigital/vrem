import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ProjectChatChannel, UserAccountType } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async userHasAccessToProject(args: {
    userId: string;
    accountType?: string;
    projectId: string;
  }) {
    const { userId, projectId } = args;
    const roleUpper = (args.accountType || '').toUpperCase();
    const accountType =
      roleUpper === 'AGENT'
        ? UserAccountType.AGENT
        : ['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'DISPATCHER', 'COMPANY'].includes(
            roleUpper,
          )
        ? UserAccountType.COMPANY
        : ['PROVIDER', 'TECHNICIAN', 'EDITOR'].includes(roleUpper)
        ? UserAccountType.PROVIDER
        : UserAccountType.PROVIDER; // default to provider for unknown roles

    // Dispatchers/Company get full access
    if (accountType === UserAccountType.COMPANY) {
      return true;
    }
    // Providers (technicians/editors) can send/receive; backend does not distinguish roles beyond account type
    if (accountType === UserAccountType.PROVIDER) {
      return true;
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        technicianId: true,
        editorId: true,
        projectManagerId: true,
        customer: { select: { userId: true } },
      },
    });

    if (!project) return false;

    if (
      accountType === UserAccountType.AGENT &&
      project.customer?.userId === userId
    ) {
      return true;
    }

    return (
      project.projectManagerId === userId ||
      project.technicianId === userId ||
      project.editorId === userId
    );
  }

  async sendMessage(userId: string, dto: SendMessageDto) {
    // Ensure project exists (optional but nice)
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) throw new NotFoundException('Project not found');

    const channel: ProjectChatChannel =
      dto.channel ||
      (dto as any)?.channel ||
      ((dto as any)?.chatType === 'CUSTOMER'
        ? ProjectChatChannel.CUSTOMER
        : ProjectChatChannel.TEAM);

    const thread = dto.thread || null;

    if (thread) {
      const parent = await this.prisma.message.findFirst({
        where: { id: thread, projectId: dto.projectId, channel },
      });
      if (!parent) {
        throw new ForbiddenException('Parent message not found for this project/channel');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        projectId: dto.projectId,
        userId,
        content: dto.content,
        channel,
        thread,
      },
      include: {
        user: true,
      },
    });

    return message;
  }

  async getMessagesForProject(projectId: string) {
    return this.prisma.message.findMany({
      where: { projectId },
      orderBy: { timestamp: 'asc' },
      include: {
        user: true,
      },
    });
  }

  async getMessageById(id: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  async deleteMessage(
    id: string,
    currentUser: { id: string; accountType: UserAccountType },
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id },
    });

    if (!message) throw new NotFoundException('Message not found');

    const canAccess = await this.userHasAccessToProject({
      userId: currentUser.id,
      accountType: currentUser.accountType,
      projectId: message.projectId,
    });

    const isOwner = message.userId === currentUser.id;
    const canModerate =
      currentUser.accountType === UserAccountType.COMPANY;

    if (!canAccess || (!isOwner && !canModerate)) {
      throw new ForbiddenException('You are not allowed to delete this message');
    }

    await this.prisma.message.delete({
      where: { id },
    });

    return { success: true };
  }
}
