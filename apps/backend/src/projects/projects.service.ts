import { Injectable, ForbiddenException, NotFoundException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus, UserAccountType, ProjectChatChannel } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CronofyService } from '../cronofy/cronofy.service';
import { Prisma } from '@prisma/client';
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

  private async geocodeAddress(unparsed: string) {
    const token =
      process.env.MAPBOX_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      '';
    if (!token || !unparsed) return null;

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        unparsed,
      )}.json?access_token=${token}&limit=1`;
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Geocoding failed: ${response.statusText}`);
        return null;
      }
      const data = await response.json();
      const feature = data?.features?.[0];
      if (!feature?.center || feature.center.length < 2) return null;
      const [lng, lat] = feature.center;

      const ctx = feature.context || [];
      const byId = (prefix: string) =>
        ctx.find((c: any) => (c.id || '').startsWith(prefix));

      return {
        latitude: lat,
        longitude: lng,
        street_number: feature.address || undefined,
        street_name: feature.text || undefined,
        postal_code: byId('postcode')?.text || undefined,
        city:
          byId('place')?.text ||
          byId('locality')?.text ||
          byId('district')?.text ||
          undefined,
        state_or_province:
          byId('region')?.short_code ||
          byId('region')?.text ||
          undefined,
        country: byId('country')?.short_code || undefined,
        unparsed_address: feature.place_name || unparsed,
      };
    } catch (error) {
      this.logger.error('Geocoding error', error as any);
      return null;
    }
  }

  private async resolveAddress(
    dto: Partial<CreateProjectDto | UpdateProjectDto>,
    existing?: any,
  ) {
    const merged: any = {
      addressLine1: existing?.addressLine1,
      addressLine2: existing?.addressLine2,
      city: existing?.city,
      region: existing?.region,
      postalCode: existing?.postalCode,
      countryCode: existing?.countryCode,
      lat: existing?.lat,
      lng: existing?.lng,
    };

    const apply = (key: keyof typeof merged, value: any) => {
      if (value !== undefined) {
        merged[key] = value;
      }
    };

    apply('addressLine1', dto.addressLine1);
    apply('addressLine2', dto.addressLine2);
    apply('city', dto.city);
    apply('region', dto.region);
    apply('postalCode', dto.postalCode);
    apply('countryCode', dto.countryCode);
    apply('lat', dto.lat);
    apply('lng', dto.lng);

    const addressString = [
      merged.addressLine1,
      merged.addressLine2,
      merged.city,
      merged.region,
      merged.postalCode,
      merged.countryCode,
    ]
      .filter(Boolean)
      .join(', ');

    const needsCoords =
      (merged.lat === undefined || merged.lng === undefined) && !!addressString;

    if (needsCoords) {
      const geocoded = await this.geocodeAddress(addressString);
      if (geocoded) {
        merged.lat = geocoded.latitude ?? merged.lat;
        merged.lng = geocoded.longitude ?? merged.lng;
        merged.addressLine1 =
          merged.addressLine1 ||
          [geocoded.street_number, geocoded.street_name]
            .filter(Boolean)
            .join(' ') ||
          merged.addressLine1;
        merged.city = merged.city || geocoded.city;
        merged.region = merged.region || geocoded.state_or_province;
        merged.postalCode = merged.postalCode || geocoded.postal_code;
        merged.countryCode = merged.countryCode || geocoded.country;
      }
    }

    return merged;
  }

  private async ensureCustomerInOrg(customerId: string, orgId: string) {
    const customer = await this.prisma.organizationCustomer.findFirst({
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
        technician: true,
        editor: true,
        projectManager: true,
        media: true,
        messages: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get projects for logged-in user
  async findForUser(userId: string, accountType: UserAccountType, orgId: string | null) {
    this.logger.log(`findForUser called with userId: ${userId}, role: ${accountType}, orgId: ${orgId || 'null'}`);

    try {
      if (accountType === UserAccountType.AGENT) {
        const whereClause: any = {
          customer: { userId },
        };
        this.logger.log(
          `Querying projects for AGENT via customer.userId=${userId}, orgId=${orgId || 'any'}`,
        );
        const result = await this.prisma.project.findMany({
          where: whereClause,
          include: {
            media: true,
            customer: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        this.logger.log(`Found ${result.length} projects for AGENT`);
        return result;
      }

    if (accountType === UserAccountType.PROVIDER) {
        if (!orgId) {
          throw new ForbiddenException('Organization ID required for technicians');
        }
        this.logger.log(`Querying projects for PROVIDER: technicianId=${userId}, orgId=${orgId}`);
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
        this.logger.log(`Found ${result.length} projects for PROVIDER`);
        return result;
  }

    if (accountType === UserAccountType.COMPANY) {
      if (!orgId) {
        throw new ForbiddenException('Organization ID required for dispatchers');
      }
      this.logger.log(`Querying projects for COMPANY: orgId=${orgId}`);
      const result = await this.prisma.project.findMany({
        where: { orgId },
        include: {
          media: true,
          customer: true,
          technician: true,
          editor: true,
          projectManager: true,
          messages: {
            include: { user: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      this.logger.log(`Found ${result.length} projects for COMPANY`);
      return result;
    }

      return [];
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

    const address = await this.resolveAddress(dto);

    return this.prisma.project.create({
      data: {
        orgId,
        customerId: dto.customerId,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        region: address.region,
        postalCode: address.postalCode,
        countryCode: address.countryCode,
        lat: address.lat,
        lng: address.lng,
        notes: dto.notes,
        scheduledTime: new Date(dto.scheduledTime),
        projectManagerId: dto.projectManagerId,
        technicianId: dto.technicianId,
        editorId: dto.editorId,
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

async assignTechnician(projectId: string, technicianId: string, orgId: string) {
  const project = await this.ensureProjectInOrg(projectId, orgId);
  const technician = await this.ensureUserExists(technicianId);

  const updated = await this.prisma.project.update({
    where: { id: projectId },
    data: { technicianId },
    include: {
      technician: true,
      editor: true,
      media: true,
      messages: true,
      customer: true,
      projectManager: true,
    },
  });

  if (project.scheduledTime && process.env.CRONOFY_ACCESS_TOKEN) {
    await this.cronofy.createEvent(updated, technician);
  }

  return updated;
}

async assignCustomer(projectId: string, customerId: string, orgId: string) {
  await this.ensureProjectInOrg(projectId, orgId);
  await this.ensureCustomerInOrg(customerId, orgId);

  return this.prisma.project.update({
    where: { id: projectId },
    data: { customerId },
    include: {
      technician: true,
      editor: true,
      media: true,
      messages: true,
      customer: true,
      projectManager: true,
    },
  });
}



async assignEditor(projectId: string, editorId: string, orgId: string) {
  await this.ensureUserExists(editorId);
  await this.ensureProjectInOrg(projectId, orgId);
  return this.prisma.project.update({
    where: { id: projectId },
    data: { editorId },
  });
}

async assignProjectManager(projectId: string, projectManagerId: string, orgId: string) {
  await this.ensureUserExists(projectManagerId);
  await this.ensureProjectInOrg(projectId, orgId);
  return this.prisma.project.update({
    where: { id: projectId },
    data: { projectManagerId },
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
  user: { id: string; accountType: UserAccountType },
  orgId: string
) {
  const project = await this.ensureProjectInOrg(projectId, orgId);

  const current = project.status;

  // Dispatcher override
  if (user.accountType === UserAccountType.COMPANY) {
    return this.setProjectStatus(projectId, newStatus);
  }

  // Tech transitions
  if (user.accountType === UserAccountType.PROVIDER) {
    if (current === ProjectStatus.BOOKED && newStatus === ProjectStatus.SHOOTING) {
      return this.setProjectStatus(projectId, newStatus);
    }
    if (current === ProjectStatus.SHOOTING && newStatus === ProjectStatus.EDITING) {
      return this.setProjectStatus(projectId, newStatus);
    }
    throw new ForbiddenException('Technician cannot perform this transition');
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
        technician: true,
        editor: true,
        projectManager: true,
        media: true,
        customer: true,
        messages: true,
      },
    });
  }

  async findOneForUser(
    id: string,
    userId: string,
    accountType: UserAccountType,
    orgId: string,
    membershipRole?: string | null,
  ) {
    // Use findFirst instead of findUnique since orgId is not unique
    const where: any = { id };
    // Only enforce org boundary for company/provider roles
    if (accountType !== UserAccountType.AGENT) {
      where.orgId = orgId;
    }

    const include: Prisma.ProjectInclude = {
      technician: true,
      editor: true,
      projectManager: true,
      media: true,
      customer: true,
    };

    if (accountType !== UserAccountType.AGENT) {
      include.messages = {
        include: { user: true },
      };
    }

    const project = await this.prisma.project.findFirst({
      where,
      include,
    });

    if (!project) return null;

    const elevatedOrgRoles = ['OWNER', 'ADMIN', 'PROJECT_MANAGER'];
    if (membershipRole && elevatedOrgRoles.includes(membershipRole)) {
      return project;
    }

    if (accountType === UserAccountType.COMPANY) return project;

    if (accountType === UserAccountType.AGENT) {
      const isAttached = project.customer?.userId === userId;
      return isAttached ? project : null;
    }
    if (accountType === UserAccountType.PROVIDER && project.technicianId !== userId) return null;

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, orgId: string) {
    await this.ensureProjectInOrg(id, orgId);
    const existing = await this.prisma.project.findUnique({ where: { id } });
    const address = await this.resolveAddress(dto, existing);

    return this.prisma.project.update({
      where: { id },
      data: {
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        region: address.region,
        postalCode: address.postalCode,
        countryCode: address.countryCode,
        lat: address.lat,
        lng: address.lng,
        notes: dto.notes,
        scheduledTime: dto.scheduledTime ? new Date(dto.scheduledTime) : undefined,
      },
    });
  }

async findForOrg(orgId: string) {
  return this.prisma.project.findMany({
    where: { orgId },
    include: { projectManager: true, technician: true, editor: true, customer: true },
    orderBy: { createdAt: 'desc' },
  });
}


async remove(id: string, orgId: string, user: { id: string; accountType: UserAccountType }, membershipRole?: string | null) {
  const project = await this.ensureProjectInOrg(id, orgId);

  const elevatedOrgRoles = ['OWNER', 'ADMIN', 'PROJECT_MANAGER'];
  const isElevated = membershipRole && elevatedOrgRoles.includes(membershipRole);

  const isAgentOwner = user.accountType === UserAccountType.AGENT && project.projectManagerId === user.id;
  const isCompany = user.accountType === UserAccountType.COMPANY && isElevated;

  if (!(isAgentOwner || isCompany)) {
    throw new ForbiddenException('You are not allowed to delete this project');
  }

  return this.prisma.project.delete({ where: { id }});
}

  // Fetch messages for a project (only if user belongs to it or is allowed)
  async getMessages(
    projectId: string,
    user: { id: string; accountType: UserAccountType },
    orgId: string,
    membershipRole?: string | null,
    channel: ProjectChatChannel = ProjectChatChannel.TEAM,
  ) {
    const include = {
      technician: true,
      editor: true,
      customer: true,
      projectManager: true,
    };

    // Agents may not be org members; fetch by id only for them
    const project = await this.prisma.project.findFirst({
      where:
        user.accountType === UserAccountType.AGENT
          ? { id: projectId }
          : { id: projectId, orgId },
      include,
    });

    if (!project) {
      throw new ForbiddenException('Project does not belong to your organization');
    }

    const elevatedOrgRoles = ['OWNER', 'ADMIN', 'PROJECT_MANAGER'];
    const isElevated = membershipRole && elevatedOrgRoles.includes(membershipRole);

    if (isElevated || user.accountType === UserAccountType.COMPANY) {
      return this.prisma.message.findMany({
        where: { projectId, channel },
        orderBy: { timestamp: 'asc' },
        include: { user: true },
      });
    }

    if (user.accountType === UserAccountType.AGENT) {
      const isAttached = project.customer?.userId === user.id;
      if (!isAttached) {
        throw new ForbiddenException('Not allowed');
      }
      return this.prisma.message.findMany({
        where: { projectId, channel },
        orderBy: { timestamp: 'asc' },
        include: { user: true },
      });
    }

    if (
      user.accountType === UserAccountType.PROVIDER &&
      project.technicianId !== user.id
    ) {
      throw new ForbiddenException('Not allowed');
    }

    return this.prisma.message.findMany({
      where: { projectId, channel },
      orderBy: { timestamp: 'asc' },
      include: { user: true },
    });
  }



  // Post a new message
  async addMessage(
    projectId: string,
    dto: CreateMessageDto,
    user: { id: string; accountType: UserAccountType },
    orgId: string,
    membershipRole?: string | null
  ) {
    const project = await this.prisma.project.findFirst({
      where:
        user.accountType === UserAccountType.AGENT
          ? { id: projectId }
          : { id: projectId, orgId },
      include: {
        technician: true,
        editor: true,
        customer: true,
        projectManager: true,
      },
    });

    if (!project) {
      throw new ForbiddenException('Project does not belong to your organization');
    }

    const elevatedOrgRoles = ['OWNER', 'ADMIN', 'PROJECT_MANAGER'];
    const isElevated = membershipRole && elevatedOrgRoles.includes(membershipRole);

    const channel = dto.channel || ProjectChatChannel.TEAM;
    const thread = dto.thread || null;

    if (thread) {
      const parent = await this.prisma.message.findFirst({
        where: { id: thread, projectId, channel },
      });
      if (!parent) {
        throw new ForbiddenException('Parent message not found for this project/channel');
      }
    }

    if (!isElevated) {
      if (user.accountType === UserAccountType.AGENT) {
        const isAttached = project.customer?.userId === user.id;
        if (!isAttached) {
          throw new ForbiddenException('Not allowed');
        }
      } else if (
        user.accountType === UserAccountType.PROVIDER &&
        project.technicianId !== user.id
      ) {
        throw new ForbiddenException('Not allowed');
      } else if (user.accountType === UserAccountType.COMPANY) {
        // allowed
      } else {
        throw new ForbiddenException('Not allowed');
      }
    }

    return this.prisma.message.create({
      data: {
        projectId,
        userId: user.id,
        content: dto.content,
        channel,
        thread,
      },
      include: { user: true },
    });
  }


  
}
