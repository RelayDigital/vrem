import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus, Role } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

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
  async create(dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        agentId: dto.agentId,
        address: dto.address,
        notes: dto.notes,
        scheduledTime: new Date(dto.scheduledTime),
      }
    });
  }


  // Assign Technician + Editor
  async assign(projectId: string, dto: AssignProjectDto) {
    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        technicianId: dto.technicianId,
        editorId: dto.editorId,
      }
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

  async findOneForUser(id: string, userId: string, role: Role) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        agent: true,
        technician: true,
        editor: true,
        mediaItems: true,
        messages: true,
      }
    });

    if (!project) return null;

    if (role === 'ADMIN' || role === 'PROJECT_MANAGER') return project;

    if (role === 'AGENT' && project.agentId !== userId) return null;
    if (role === 'TECHNICIAN' && project.technicianId !== userId) return null;
    if (role === 'EDITOR' && project.editorId !== userId) return null;

    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
  return this.prisma.project.update({
    where: { id },
    data: { 
      ...dto,
      scheduledTime: dto.scheduledTime ? new Date(dto.scheduledTime) : undefined
    }
  });
}

async remove(id: string) {
  return this.prisma.project.delete({ where: { id }});
}

  
}
