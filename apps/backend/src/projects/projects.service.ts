import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus, Role } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  // Get all projects (PM + Admin)
  findAll() {
    return this.prisma.project.findMany({
      include: {
        agent: true,
        technician: true,
        editor: true,
        mediaItems: true,
        messages: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get projects for logged-in user
  async findForUser(userId: string, role: Role) {
    if (role === 'AGENT') {
      return this.prisma.project.findMany({
        where: { agentId: userId },
        include: { mediaItems: true, messages: true },
      });
    }

    if (role === 'TECHNICIAN') {
      return this.prisma.project.findMany({
        where: { technicianId: userId },
        include: { mediaItems: true, messages: true },
      });
    }

    if (role === 'EDITOR') {
      return this.prisma.project.findMany({
        where: { editorId: userId },
        include: { mediaItems: true, messages: true },
      });
    }

    // Admin/PM: return everything
    return this.findAll();
  }

  // Create project (PM or Agent booking)
  create(data: any) {
    return this.prisma.project.create({
      data,
    });
  }

  // Assign Technician + Editor
  assign(projectId: string, techId?: string, editorId?: string) {
    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        technicianId: techId,
        editorId: editorId,
      },
    });
  }

  // Update status (pipeline movement)
  updateStatus(projectId: string, status: ProjectStatus) {
    return this.prisma.project.update({
      where: { id: projectId },
      data: { status },
    });
  }

  // Get one project
  findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        agent: true,
        technician: true,
        editor: true,
        mediaItems: true,
        messages: true,
      },
    });
  }
}
