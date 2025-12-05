import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UserAccountType } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async userHasAccessToProject(userId: string, accountType: UserAccountType, projectId: string) {
    // Dispatchers get full access
    if (accountType === UserAccountType.COMPANY) {
      return true;
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        technicianId: true,
        editorId: true,
        projectManagerId: true,
      },
    });

    if (!project) return false;

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

    const message = await this.prisma.message.create({
      data: {
        projectId: dto.projectId,
        userId,
        content: dto.content,
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

    const canAccess = await this.userHasAccessToProject(
      currentUser.id,
      currentUser.accountType,
      message.projectId,
    );

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
