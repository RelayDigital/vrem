import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Role } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

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

  async deleteMessage(messageId: string, currentUser: { id: string; role: Role }) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message not found');

    const isOwner = message.userId === currentUser.id;
    const canModerate =
      currentUser.role === Role.ADMIN || currentUser.role === Role.PROJECT_MANAGER;

    if (!isOwner && !canModerate) {
      throw new ForbiddenException('You are not allowed to delete this message');
    }

    await this.prisma.message.delete({
      where: { id: messageId },
    });

    return { success: true };
  }
}
