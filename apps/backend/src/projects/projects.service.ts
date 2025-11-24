import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus, Role } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CronofyService } from '../cronofy/cronofy.service';
@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private cronofy: CronofyService
  ) {}

  // Get all projects (PM + Admin)
  findAll() {
    return this.prisma.project.findMany({
      include: {
        agent: true,
        technician: true,
        editor: true,
        media: true,
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
        include: { media: true, messages: true },
      });
    }

    if (role === 'TECHNICIAN') {
      return this.prisma.project.findMany({
        where: { technicianId: userId },
        include: { media: true, messages: true },
      });
    }

    if (role === 'EDITOR') {
      return this.prisma.project.findMany({
        where: { editorId: userId },
        include: { media: true, messages: true },
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

  async assignAgent(projectId: string, agentId: string) {
  await this.ensureUserExists(agentId);
  return this.prisma.project.update({
    where: { id: projectId },
    data: { agentId },
  });
}

async assignTechnician(projectId: string, technicianId: string) {
  const project = await this.prisma.project.findUnique({ where: { id: projectId } });
  const technician = await this.prisma.user.findUnique({ where: { id: technicianId }});

  const updated = await this.prisma.project.update({
    where: { id: projectId },
    data: { technicianId },
  });

  if (project!.scheduledTime) {
    await this.cronofy.createEvent(updated, technician);
  }

  return updated;
}


async assignEditor(projectId: string, editorId: string) {
  await this.ensureUserExists(editorId);
  return this.prisma.project.update({
    where: { id: projectId },
    data: { editorId },
  });
}

async scheduleProject(projectId: string, scheduled: Date) {
  const project = await this.prisma.project.update({
    where: { id: projectId },
    data: { scheduledTime: scheduled },
  });

  const event = await this.prisma.calendarEvent.findUnique({
    where: { projectId },
  });

  if (event) {
    await this.cronofy.updateEvent(project, event);
  }

  return project;
}


private async ensureUserExists(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundException('User not found');
}



  
  // Update status (pipeline movement with role rules)
async updateStatus(projectId: string, newStatus: ProjectStatus, user: { id: string; role: Role }) {
  const project = await this.prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundException('Project not found');
  }

  const currentStatus = project.status;

  // Admin & PM can set any status
  if (user.role === 'ADMIN' || user.role === 'PROJECT_MANAGER') {
    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: newStatus },
    });
  }

  // Technician rules
  if (user.role === 'TECHNICIAN') {
    if (project.technicianId !== user.id) {
      throw new ForbiddenException('You are not assigned to this project as technician');
    }

    const allowed =
      (currentStatus === ProjectStatus.BOOKED && newStatus === ProjectStatus.SHOOTING) ||
      (currentStatus === ProjectStatus.SHOOTING && newStatus === ProjectStatus.EDITING);

    if (!allowed) {
      throw new ForbiddenException(
        `Technician cannot move project from ${currentStatus} to ${newStatus}`,
      );
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: newStatus },
    });
  }

  // Editor rules
  if (user.role === 'EDITOR') {
    if (project.editorId !== user.id) {
      throw new ForbiddenException('You are not assigned to this project as editor');
    }

    const allowed =
      currentStatus === ProjectStatus.EDITING && newStatus === ProjectStatus.DELIVERED;

    if (!allowed) {
      throw new ForbiddenException(
        `Editor cannot move project from ${currentStatus} to ${newStatus}`,
      );
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: newStatus },
    });
  }

  // Fallback: other roles should be blocked by @Roles decorator already
  throw new ForbiddenException('You are not allowed to update project status');
}


  // Get one project
  findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        agent: true,
        technician: true,
        editor: true,
        media: true,
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
        media: true,
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

// Fetch messages for a project (only if user belongs to it or is PM/Admin)
async getMessages(projectId: string, user: { id: string; role: Role }) {
  const project = await this.findOneForUser(projectId, user.id, user.role);
  if (!project) {
    throw new ForbiddenException('Not allowed to view messages for this project');
  }

  return this.prisma.message.findMany({
    where: { projectId },
    orderBy: { timestamp: 'asc' },
    include: { user: true },
  });
}


// Post a new message
async addMessage(
  projectId: string,
  dto: CreateMessageDto,
  user: { id: string; role: Role }
) {
  // Check access
  const project = await this.findOneForUser(projectId, user.id, user.role);
  if (!project) {
    throw new ForbiddenException('Not allowed to send messages for this project');
  }

  return this.prisma.message.create({
    data: {
      projectId,
      userId: user.id,
      content: dto.content,
    },
    include: { user: true },
  });
}

  
}
