import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectChatChannel, ProjectStatus } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { PrismaService } from '../prisma/prisma.service';
import { CronofyService } from '../cronofy/cronofy.service';
import { AssignProjectDto } from './dto/assign-project.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private prisma: PrismaService,
    private cronofy: CronofyService,
    private authorization: AuthorizationService,
  ) {}

  private isManagerRole(ctx: OrgContext) {
    return (
      ctx.effectiveRole === 'PERSONAL_OWNER' ||
      ctx.effectiveRole === 'OWNER' ||
      ctx.effectiveRole === 'ADMIN' ||
      ctx.effectiveRole === 'PROJECT_MANAGER'
    );
  }

  private async ensureProjectInOrg(
    projectId: string,
    ctx: OrgContext,
    include?: Prisma.ProjectInclude,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId: ctx.org.id },
      include,
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

  private async ensureCustomerInOrg(customerId: string, ctx: OrgContext) {
    const customer = await this.prisma.organizationCustomer.findFirst({
      where: { id: customerId, orgId: ctx.org.id },
    });

    if (!customer) {
      throw new ForbiddenException('Customer does not belong to your organization');
    }

    return customer;
  }
  private async ensureUserExists(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private projectInclude(withMessages = false): Prisma.ProjectInclude {
    const include: Prisma.ProjectInclude = {
      technician: true,
      editor: true,
      projectManager: true,
      media: true,
      customer: true,
    };

    if (withMessages) {
      include.messages = { include: { user: true } };
    }

    return include;
  }

  async findForUser(ctx: OrgContext, user: AuthenticatedUser) {
    if (ctx.effectiveRole === 'NONE') {
      throw new ForbiddenException('You are not a member of this organization');
    }

    try {
      const orgId = ctx.org.id;
      const include = this.projectInclude(true);

      if (this.isManagerRole(ctx)) {
        return this.prisma.project.findMany({
          where: { orgId },
          include,
          orderBy: { createdAt: 'desc' },
        });
      }

      if (ctx.effectiveRole === 'TECHNICIAN') {
        return this.prisma.project.findMany({
          where: { orgId, technicianId: user.id },
          include,
          orderBy: { createdAt: 'desc' },
        });
      }

      if (ctx.effectiveRole === 'EDITOR') {
        return this.prisma.project.findMany({
          where: { orgId, editorId: user.id },
          include,
          orderBy: { createdAt: 'desc' },
        });
      }

      return this.prisma.project.findMany({
        where: { orgId, projectManagerId: user.id },
        include,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      this.logger.error(`Error in findForUser: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to fetch projects: ${error.message}`,
        error.code === 'P2002'
          ? HttpStatus.CONFLICT
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findForOrg(ctx: OrgContext) {
    if (!this.isManagerRole(ctx)) {
      throw new ForbiddenException(
        'You are not allowed to view all projects for this organization',
      );
    }

    return this.prisma.project.findMany({
      where: { orgId: ctx.org.id },
      include: this.projectInclude(true),
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(ctx: OrgContext, dto: CreateProjectDto) {
    if (!this.isManagerRole(ctx)) {
      throw new ForbiddenException('You cannot create projects for this org');
    }

    if (dto.customerId) {
      await this.ensureCustomerInOrg(dto.customerId, ctx);
    }

    const address = await this.resolveAddress(dto);

    return this.prisma.project.create({
      data: {
        orgId: ctx.org.id,
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
      },
    });
  }

  async findOneForUser(
    id: string,
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    const project = await this.ensureProjectInOrg(
      id,
      ctx,
      this.projectInclude(true),
    );

    if (!this.authorization.canViewProject(ctx, project)) {
      throw new ForbiddenException('You are not allowed to view this project');
    }

    return project;
  }

  async assign(projectId: string, dto: AssignProjectDto, ctx: OrgContext) {
    const project = await this.ensureProjectInOrg(projectId, ctx);
    if (!this.authorization.canManageProject(ctx, project)) {
      throw new ForbiddenException('You cannot manage this project');
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        technicianId: dto.technicianId,
        editorId: dto.editorId,
      },
    });
  }

  async assignTechnician(
    projectId: string,
    technicianId: string,
    ctx: OrgContext,
  ) {
    const project = await this.ensureProjectInOrg(projectId, ctx);
    if (!this.authorization.canManageProject(ctx, project)) {
      throw new ForbiddenException('You cannot manage this project');
    }

    const technician = await this.ensureUserExists(technicianId);

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { technicianId },
      include: this.projectInclude(true),
    });

    if (project.scheduledTime && process.env.CRONOFY_ACCESS_TOKEN) {
      await this.cronofy.createEvent(updated, technician);
    }

    return updated;
  }

  async assignCustomer(
    projectId: string,
    customerId: string,
    ctx: OrgContext,
  ) {
    const project = await this.ensureProjectInOrg(projectId, ctx);
    if (!this.authorization.canManageProject(ctx, project)) {
      throw new ForbiddenException('You cannot manage this project');
    }

    await this.ensureCustomerInOrg(customerId, ctx);

    return this.prisma.project.update({
      where: { id: projectId },
      data: { customerId },
      include: this.projectInclude(true),
    });
  }

  async assignEditor(projectId: string, editorId: string, ctx: OrgContext) {
    const project = await this.ensureProjectInOrg(projectId, ctx);
    if (!this.authorization.canManageProject(ctx, project)) {
      throw new ForbiddenException('You cannot manage this project');
    }

    await this.ensureUserExists(editorId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: { editorId },
    });
  }

  async assignProjectManager(
    projectId: string,
    projectManagerId: string,
    ctx: OrgContext,
  ) {
    const project = await this.ensureProjectInOrg(projectId, ctx);
    if (!this.authorization.canManageProject(ctx, project)) {
      throw new ForbiddenException('You cannot manage this project');
    }

    await this.ensureUserExists(projectManagerId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: { projectManagerId },
    });
  }

  async scheduleProject(
    projectId: string,
    scheduled: Date,
    ctx: OrgContext,
  ) {
    const project = await this.ensureProjectInOrg(projectId, ctx);
    if (!this.authorization.canManageProject(ctx, project)) {
      throw new ForbiddenException('You cannot manage this project');
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { scheduledTime: scheduled },
    });

    const event = await this.prisma.calendarEvent.findUnique({
      where: { projectId },
    });

    if (event && process.env.CRONOFY_ACCESS_TOKEN) {
      await this.cronofy.updateEvent(updated, event);
    }

    return updated;
  }

  async update(id: string, dto: UpdateProjectDto, ctx: OrgContext) {
    const project = await this.ensureProjectInOrg(id, ctx);
    if (!this.authorization.canManageProject(ctx, project)) {
      throw new ForbiddenException('You cannot update this project');
    }

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
        scheduledTime: dto.scheduledTime
          ? new Date(dto.scheduledTime)
          : undefined,
      },
    });
  }

  async remove(id: string, ctx: OrgContext) {
    const project = await this.ensureProjectInOrg(id, ctx);
    if (!this.authorization.canManageProject(ctx, project)) {
      throw new ForbiddenException('You cannot delete this project');
    }

    return this.prisma.project.delete({ where: { id } });
  }

  async updateStatus(
    projectId: string,
    newStatus: ProjectStatus,
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    const project = await this.ensureProjectInOrg(projectId, ctx);
    const current = project.status;

    if (this.authorization.canManageProject(ctx, project)) {
      return this.setProjectStatus(projectId, newStatus);
    }

    if (!this.authorization.canUpdateOwnWorkOnProject(ctx, project, user)) {
      throw new ForbiddenException('You do not have permission');
    }

    const allowed =
      (current === ProjectStatus.BOOKED &&
        newStatus === ProjectStatus.SHOOTING) ||
      (current === ProjectStatus.SHOOTING &&
        newStatus === ProjectStatus.EDITING);

    if (!allowed) {
      throw new ForbiddenException('Not allowed to perform this transition');
    }

    return this.setProjectStatus(projectId, newStatus);
  }

  private async setProjectStatus(projectId: string, status: ProjectStatus) {
    return this.prisma.project.update({
      where: { id: projectId },
      data: { status },
    });
  }

  async getMessages(
    projectId: string,
    ctx: OrgContext,
    user: AuthenticatedUser,
    channel: ProjectChatChannel = ProjectChatChannel.TEAM,
  ) {
    const project = await this.ensureProjectInOrg(projectId, ctx, {
      technician: true,
      editor: true,
      projectManager: true,
      customer: true,
    });

    if (!this.authorization.canViewProject(ctx, project)) {
      throw new ForbiddenException('Not allowed');
    }

    const normalizedChannel =
      channel === ProjectChatChannel.CUSTOMER ? 'customer' : 'team';
    if (
      normalizedChannel === 'customer' &&
      !this.authorization.canPostMessage(ctx, project, 'customer', user)
    ) {
      throw new ForbiddenException('Not allowed to view this channel');
    }

    return this.prisma.message.findMany({
      where: { projectId, channel },
      orderBy: { timestamp: 'asc' },
      include: { user: true },
    });
  }

  async addMessage(
    projectId: string,
    dto: CreateMessageDto,
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    const project = await this.ensureProjectInOrg(projectId, ctx, {
      technician: true,
      editor: true,
      projectManager: true,
      customer: true,
    });

    const normalizedChannel =
      dto.channel === ProjectChatChannel.CUSTOMER ? 'customer' : 'team';

    if (
      !this.authorization.canPostMessage(ctx, project, normalizedChannel, user)
    ) {
      throw new ForbiddenException('You are not allowed to post here');
    }

    const thread = dto.thread || null;
    const channel = dto.channel || ProjectChatChannel.TEAM;

    if (thread) {
      const parent = await this.prisma.message.findFirst({
        where: { id: thread, projectId, channel },
      });
      if (!parent) {
        throw new ForbiddenException(
          'Parent message not found for this project/channel',
        );
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
