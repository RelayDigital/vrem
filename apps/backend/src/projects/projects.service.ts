import { Injectable, ForbiddenException, NotFoundException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus, Role } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CronofyService } from '../cronofy/cronofy.service';
@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private prisma: PrismaService,
    private cronofy: CronofyService
  ) {}

  private async ensureProjectInOrg(projectId: string, orgId: string) {
  const project = await this.prisma.project.findFirst({
    where: { id: projectId, orgId }
  });

  if (!project) {
    throw new ForbiddenException('Project does not belong to your organization');
  }

  return project;
}

  private async ensureCustomerInOrg(customerId: string, orgId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, orgId },
    });

    if (!customer) {
      throw new ForbiddenException('Customer does not belong to your organization');
    }

    return customer;
  }


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
  async findForUser(userId: string, role: Role, orgId: string | null) {
    this.logger.log(`findForUser called with userId: ${userId}, role: ${role}, orgId: ${orgId || 'null'}`);

    try {
  if (role === Role.AGENT) {
        // Agents can query by agentId only (they may not be org members)
        const whereClause: any = { agentId: userId };
        if (orgId) {
          whereClause.orgId = orgId;
        }
        
        this.logger.log(`Querying projects for AGENT: agentId=${userId}, orgId=${orgId || 'any'}`);
        const result = await this.prisma.project.findMany({
          where: whereClause,
          include: { 
            media: true, 
            customer: true,
            messages: {
              include: { user: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        this.logger.log(`Found ${result.length} projects for AGENT`);
        return result;
  }

  if (role === Role.TECHNICIAN) {
        if (!orgId) {
          throw new ForbiddenException('Organization ID required for technicians');
        }
        this.logger.log(`Querying projects for TECHNICIAN: technicianId=${userId}, orgId=${orgId}`);
        const result = await this.prisma.project.findMany({
      where: { technicianId: userId, orgId },
          include: { 
            media: true, 
            customer: true,
            messages: {
              include: { user: true },
            },
          },
        });
        this.logger.log(`Found ${result.length} projects for TECHNICIAN`);
        return result;
  }

  if (role === Role.EDITOR) {
        if (!orgId) {
          throw new ForbiddenException('Organization ID required for editors');
        }
        this.logger.log(`Querying projects for EDITOR: editorId=${userId}, orgId=${orgId}`);
        const result = await this.prisma.project.findMany({
      where: { editorId: userId, orgId },
          include: { 
            media: true, 
            customer: true,
            messages: {
              include: { user: true },
            },
          },
        });
        this.logger.log(`Found ${result.length} projects for EDITOR`);
        return result;
  }

  // PM / Admin → still scoped to org
      if (!orgId) {
        throw new ForbiddenException('Organization ID required for project managers and admins');
      }
      this.logger.log(`Querying projects for PM/Admin: orgId=${orgId}`);
      const result = await this.prisma.project.findMany({
    where: { orgId },
    include: {
      agent: true,
      technician: true,
      editor: true,
      media: true,
      customer: true,
          messages: {
            include: { user: true },
          },
    },
    orderBy: { createdAt: 'desc' },
  });
      this.logger.log(`Found ${result.length} projects for PM/Admin`);
      return result;
    } catch (error: any) {
      this.logger.error(`Error in findForUser: ${error.message}`, error.stack);
      this.logger.error(`Error meta: ${JSON.stringify(error.meta || {})}`);
      throw new HttpException(
        `Failed to fetch projects: ${error.message}`,
        error.code === 'P2002' ? HttpStatus.CONFLICT : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
}


  // Create project (PM or Agent booking)
  async create(dto: CreateProjectDto, orgId: string) {
    if (dto.customerId) {
      await this.ensureCustomerInOrg(dto.customerId, orgId);
    }

    return this.prisma.project.create({
      data: {
        orgId,
        agentId: dto.agentId,
        customerId: dto.customerId,
        address: dto.address,
        notes: dto.notes,
        scheduledTime: new Date(dto.scheduledTime),
      }
    });
  }


  // Assign Technician + Editor
  async assign(projectId: string, dto: AssignProjectDto, orgId: string) {
    await this.ensureProjectInOrg(projectId, orgId);
    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        technicianId: dto.technicianId,
        editorId: dto.editorId,
      }
    });
  }

  async assignAgent(projectId: string, agentId: string, orgId: string) {
  await this.ensureUserExists(agentId);
  await this.ensureProjectInOrg(projectId, orgId)
  return this.prisma.project.update({
    where: { id: projectId },
    data: { agentId },
  });
}

async assignTechnician(projectId: string, technicianId: string, orgId: string) {
  const project = await this.ensureProjectInOrg(projectId, orgId);
  const technician = await this.ensureUserExists(technicianId);

  const updated = await this.prisma.project.update({
    where: { id: projectId },
    data: { technicianId },
  });

  if (project.scheduledTime && process.env.CRONOFY_ACCESS_TOKEN) {
    await this.cronofy.createEvent(updated, technician);
  }

  return updated;
}



async assignEditor(projectId: string, editorId: string, orgId: string) {
  await this.ensureUserExists(editorId);
  await this.ensureProjectInOrg(projectId, orgId);
  return this.prisma.project.update({
    where: { id: projectId },
    data: { editorId },
  });
}

async scheduleProject(projectId: string, scheduled: Date, orgId: string) {
  await this.ensureProjectInOrg(projectId, orgId);

  const project = await this.prisma.project.update({
    where: { id: projectId },
    data: { scheduledTime: scheduled },
  });

  const event = await this.prisma.calendarEvent.findUnique({
    where: { projectId },
  });

  if (event && process.env.CRONOFY_ACCESS_TOKEN) {
    await this.cronofy.updateEvent(project, event);
  }

  return project;
}



private async ensureUserExists(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundException('User not found');
}



  
  // Update status (pipeline movement with role rules)
async updateStatus(
  projectId: string,
  newStatus: ProjectStatus,
  user: { id: string; role: Role },
  orgId: string
) {
  const project = await this.ensureProjectInOrg(projectId, orgId);

  const current = project.status;

  // PM/Admin override
  if (user.role === Role.ADMIN || user.role === Role.PROJECT_MANAGER) {
    return this.setProjectStatus(projectId, newStatus);
  }

  // Tech transitions
  if (user.role === Role.TECHNICIAN) {
    if (current === ProjectStatus.BOOKED && newStatus === ProjectStatus.SHOOTING) {
      return this.setProjectStatus(projectId, newStatus);
    }
    if (current === ProjectStatus.SHOOTING && newStatus === ProjectStatus.EDITING) {
      return this.setProjectStatus(projectId, newStatus);
    }
    throw new ForbiddenException('Technician cannot perform this transition');
  }

  // Editor
  if (user.role === Role.EDITOR) {
    if (current === ProjectStatus.EDITING && newStatus === ProjectStatus.DELIVERED) {
      return this.setProjectStatus(projectId, newStatus);
    }
    throw new ForbiddenException('Editor cannot perform this transition');
  }

  throw new ForbiddenException('You do not have permission');
}


private async setProjectStatus(projectId: string, status: ProjectStatus) {
  return this.prisma.project.update({
    where: { id: projectId },
    data: { status }
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
        media: true,
        customer: true,
        messages: true,
      },
    });
  }

  async findOneForUser(id: string, userId: string, role: Role, orgId: string) {
    // Use findFirst instead of findUnique since orgId is not unique
    const project = await this.prisma.project.findFirst({
      where: { id, orgId },
      include: {
        agent: true,
        technician: true,
        editor: true,
        media: true,
        customer: true,
        messages: {
          include: { user: true },
        },
      }
    });

    if (!project) return null;

    if (role === 'ADMIN' || role === 'PROJECT_MANAGER') return project;

    if (role === 'AGENT' && project.agentId !== userId) return null;
    if (role === 'TECHNICIAN' && project.technicianId !== userId) return null;
    if (role === 'EDITOR' && project.editorId !== userId) return null;

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, orgId: string) {
    await this.ensureProjectInOrg(id, orgId)
  return this.prisma.project.update({
    where: { id },
    data: { 
      ...dto,
      scheduledTime: dto.scheduledTime ? new Date(dto.scheduledTime) : undefined
    }
  });
}

async findForOrg(orgId: string) {
  return this.prisma.project.findMany({
    where: { orgId },
    include: { agent: true, technician: true, editor: true, customer: true },
    orderBy: { createdAt: 'desc' },
  });
}


async remove(id: string, orgId: string) {
  await this.ensureProjectInOrg(id, orgId)
  return this.prisma.project.delete({ where: { id }});
}

// Fetch messages for a project (only if user belongs to it or is PM/Admin)
async getMessages(
  projectId: string,
  user: { id: string; role: Role },
  orgId: string
) {
  // Ensure the project is in the org
  const project = await this.prisma.project.findFirst({
    where: {
      id: projectId,
      orgId: orgId,
    },
    include: {
      agent: true,
      technician: true,
      editor: true
    }
  });

  if (!project) {
    throw new ForbiddenException('Project does not belong to your organization');
  }

  // Ensure the user has permission to see it
  if (user.role === Role.AGENT && project.agentId !== user.id) {
    throw new ForbiddenException('Not allowed');
  }
  if (user.role === Role.TECHNICIAN && project.technicianId !== user.id) {
    throw new ForbiddenException('Not allowed');
  }
  if (user.role === Role.EDITOR && project.editorId !== user.id) {
    throw new ForbiddenException('Not allowed');
  }

  // PM / Admin automatically allowed

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
  user: { id: string; role: Role },
  orgId: string
) {
  // Ensure project belongs to this org
  const project = await this.prisma.project.findFirst({
    where: { id: projectId, orgId },
    include: {
      agent: true,
      technician: true,
      editor: true,
    }
  });

  if (!project) {
    throw new ForbiddenException("Project does not belong to your organization");
  }

  // Permission checks
  if (user.role === Role.AGENT && project.agentId !== user.id)
    throw new ForbiddenException("Not allowed");

  if (user.role === Role.TECHNICIAN && project.technicianId !== user.id)
    throw new ForbiddenException("Not allowed");

  if (user.role === Role.EDITOR && project.editorId !== user.id)
    throw new ForbiddenException("Not allowed");

  // PM & Admin always allowed

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
