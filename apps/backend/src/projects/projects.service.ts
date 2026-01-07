import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserAccountType } from '@prisma/client';
import { ProjectChatChannel, ProjectStatus, NotificationType } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { PrismaService } from '../prisma/prisma.service';
import { CronofyService } from '../cronofy/cronofy.service';
import { AvailabilityService } from '../availability/availability.service';
import { CalendarSyncService } from '../nylas/calendar-sync.service';
import { AssignProjectDto } from './dto/assign-project.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private prisma: PrismaService,
    private cronofy: CronofyService,
    private authorization: AuthorizationService,
    private availabilityService: AvailabilityService,
    private calendarSync: CalendarSyncService,
    private notifications: NotificationsService,
    private emailService: EmailService,
  ) {}

  /**
   * Check if user has a manager-level role that can view all projects.
   * Used for determining project list visibility.
   */
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

  /**
   * Find a project with access for messaging/viewing.
   * Allows agents to access projects they're linked to as customers (cross-org).
   */
  private async findProjectForUserAccess(
    projectId: string,
    ctx: OrgContext,
    user: AuthenticatedUser,
    include?: Prisma.ProjectInclude,
  ) {
    // First try to find in current org
    let project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId: ctx.org.id },
      include,
    });

    // If not found in current org and user is an AGENT, check if they're the linked customer
    if (!project && user.accountType === UserAccountType.AGENT) {
      project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          customer: { userId: user.id },
        },
        include,
      });
    }

    if (!project) {
      throw new ForbiddenException('Project not found or access denied');
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
      organization: true, // Include organization for agent view
      clientApprovedBy: true, // Include approver for delivery state
    };

    if (withMessages) {
      include.messages = { include: { user: true } };
    }

    return include;
  }

  /**
   * Create a project assignment notification for a user.
   * Skips if the user was already notified for this project/role combination.
   */
  private async createAssignmentNotification(
    userId: string,
    projectId: string,
    orgId: string,
    role: 'TECHNICIAN' | 'EDITOR' | 'PROJECT_MANAGER' | 'CUSTOMER',
    project?: { addressLine1?: string | null; city?: string | null; status?: ProjectStatus },
  ): Promise<void> {
    try {
      // Check if notification already exists for this user/project/role combo
      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          userId,
          projectId,
          type: NotificationType.PROJECT_ASSIGNED,
          payload: {
            path: ['role'],
            equals: role,
          },
        },
      });

      if (existingNotification) {
        // Already notified for this assignment
        return;
      }

      const projectAddress = project
        ? [project.addressLine1, project.city].filter(Boolean).join(', ')
        : undefined;

      await this.prisma.notification.create({
        data: {
          userId,
          orgId,
          projectId,
          type: NotificationType.PROJECT_ASSIGNED,
          payload: {
            role,
            address: projectAddress,
            status: project?.status,
          },
        },
      });
    } catch (error) {
      // Log but don't fail the assignment if notification creation fails
      this.logger.warn(`Failed to create assignment notification: ${error}`);
    }
  }

  // =============================
  // Project listing
  // =============================

  /**
   * Find projects accessible to the current user in the given org context.
   *
   * Access rules:
   * - AGENT in personal org: sees all projects where they are the linked customer (cross-org)
   * - AGENT with customer access in non-personal org: sees their customer-assigned projects in that org
   * - Manager roles (OWNER, ADMIN, PM, PERSONAL_OWNER): sees all org projects
   * - TECHNICIAN: sees only their assigned projects
   * - EDITOR: sees only their assigned projects
   * - No membership + not agent customer: 403 Forbidden
   *
   * @returns Project[] - always returns array (empty if no projects), never throws for empty results
   * @throws ForbiddenException (403) - user lacks access to this org
   * @throws BadRequestException (400) - invalid parameters
   */
  async findForUser(ctx: OrgContext, user: AuthenticatedUser) {
    // ===========================================
    // Input validation - explicit checks to avoid 500s
    // ===========================================

    // Validate user
    if (!user || !user.id) {
      this.logger.error('[findForUser] REJECT: Invalid user object - missing user or user.id');
      throw new BadRequestException('Invalid user context');
    }

    // Validate org context
    if (!ctx || !ctx.org) {
      this.logger.error(`[findForUser] REJECT: Invalid org context - missing ctx or ctx.org | userId=${user.id}`);
      throw new BadRequestException('Invalid organization context');
    }

    if (!ctx.org.id) {
      this.logger.error(`[findForUser] REJECT: Invalid org context - missing ctx.org.id | userId=${user.id}`);
      throw new BadRequestException('Invalid organization ID');
    }

    const orgId = ctx.org.id;
    const orgType = ctx.org.type ?? 'UNKNOWN';

    this.logger.debug(`[findForUser] START | userId=${user.id} orgId=${orgId} orgType=${orgType} effectiveRole=${ctx.effectiveRole} isPersonalOrg=${ctx.isPersonalOrg} accountType=${user.accountType}`);

    // ===========================================
    // Agent customer access handling
    // ===========================================

    // AGENT in their PERSONAL org: show all projects where they are assigned as customer
    // This bypasses org boundaries - customer-assigned projects are visible regardless
    // of which org the project belongs to.
    if (user.accountType === UserAccountType.AGENT && ctx.isPersonalOrg) {
      return this.findAgentCustomerProjects(user);
    }

    // AGENT in a non-personal org where they're not a member: check for customer access
    // OrgContextGuard allows this for specific project access, so we support listing
    // their customer-assigned projects in that org.
    if (user.accountType === UserAccountType.AGENT && ctx.effectiveRole === 'NONE') {
      this.logger.debug(`[findForUser] AGENT with effectiveRole=NONE in non-personal org - checking customer access | userId=${user.id} orgId=${orgId}`);
      return this.findAgentCustomerProjectsInOrg(user, orgId);
    }

    // ===========================================
    // Membership validation for non-agents
    // ===========================================

    // Non-agents with no membership get 403
    if (ctx.effectiveRole === 'NONE') {
      this.logger.warn(`[findForUser] REJECT: effectiveRole=NONE (non-agent, no membership) | userId=${user.id} orgId=${orgId} accountType=${user.accountType}`);
      throw new ForbiddenException('You are not a member of this organization');
    }

    // ===========================================
    // Role-based project queries
    // ===========================================

    const include = this.projectInclude(true);

    try {
      // Manager roles (OWNER, ADMIN, PROJECT_MANAGER, PERSONAL_OWNER) see all org projects
      if (this.isManagerRole(ctx)) {
        this.logger.debug(`[findForUser] MANAGER role - querying all org projects | userId=${user.id} orgId=${orgId} role=${ctx.effectiveRole}`);
        const projects = await this.prisma.project.findMany({
          where: { orgId },
          include,
          orderBy: { createdAt: 'desc' },
        });
        this.logger.debug(`[findForUser] SUCCESS: MANAGER query returned ${projects.length} projects | userId=${user.id} orgId=${orgId}`);
        return projects;
      }

      // TECHNICIAN sees only their assigned projects within the org
      if (ctx.effectiveRole === 'TECHNICIAN') {
        this.logger.debug(`[findForUser] TECHNICIAN role - querying assigned projects | userId=${user.id} orgId=${orgId}`);
        const projects = await this.prisma.project.findMany({
          where: { orgId, technicianId: user.id },
          include,
          orderBy: { createdAt: 'desc' },
        });
        this.logger.debug(`[findForUser] SUCCESS: TECHNICIAN query returned ${projects.length} projects | userId=${user.id} orgId=${orgId}`);
        return projects;
      }

      // EDITOR sees only their assigned projects within the org
      if (ctx.effectiveRole === 'EDITOR') {
        this.logger.debug(`[findForUser] EDITOR role - querying assigned projects | userId=${user.id} orgId=${orgId}`);
        const projects = await this.prisma.project.findMany({
          where: { orgId, editorId: user.id },
          include,
          orderBy: { createdAt: 'desc' },
        });
        this.logger.debug(`[findForUser] SUCCESS: EDITOR query returned ${projects.length} projects | userId=${user.id} orgId=${orgId}`);
        return projects;
      }

      // Fallback for other roles: return projects where user is assigned as PM
      this.logger.debug(`[findForUser] FALLBACK: querying PM-assigned projects | userId=${user.id} orgId=${orgId} role=${ctx.effectiveRole}`);
      const projects = await this.prisma.project.findMany({
        where: { orgId, projectManagerId: user.id },
        include,
        orderBy: { createdAt: 'desc' },
      });
      this.logger.debug(`[findForUser] SUCCESS: FALLBACK query returned ${projects.length} projects | userId=${user.id} orgId=${orgId}`);
      return projects;
    } catch (error: any) {
      // Re-throw HTTP exceptions as-is
      if (error instanceof HttpException) {
        throw error;
      }

      // Log and wrap database/unexpected errors
      this.logger.error(`[findForUser] Database error: ${error.message}`, error.stack);

      // Map Prisma error codes to appropriate HTTP status
      if (error.code === 'P2025') {
        // Record not found - this shouldn't happen for findMany, but handle it
        throw new NotFoundException('Resource not found');
      }
      if (error.code === 'P2002') {
        // Unique constraint violation - shouldn't happen for reads
        throw new HttpException('Database conflict', HttpStatus.CONFLICT);
      }

      // Default to 500 for unexpected errors
      throw new HttpException(
        'Failed to fetch projects',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find all projects where an agent is the linked customer (cross-org).
   * Used when agent is in their personal org context.
   */
  private async findAgentCustomerProjects(user: AuthenticatedUser) {
    this.logger.debug(`[findAgentCustomerProjects] Querying cross-org customer projects | userId=${user.id}`);

    try {
      // Find all OrganizationCustomer records where this user is linked
      const customerRecords = await this.prisma.organizationCustomer.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      const customerIds = customerRecords.map((c) => c.id);

      this.logger.debug(`[findAgentCustomerProjects] Found ${customerIds.length} customer records | userId=${user.id}`);

      if (customerIds.length === 0) {
        this.logger.debug(`[findAgentCustomerProjects] SUCCESS: No customer records, returning empty | userId=${user.id}`);
        return [];
      }

      const include = this.projectInclude(true);
      const projects = await this.prisma.project.findMany({
        where: {
          customerId: { in: customerIds },
        },
        include: {
          ...include,
          organization: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.debug(`[findAgentCustomerProjects] SUCCESS: Returned ${projects.length} projects | userId=${user.id}`);
      return projects;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`[findAgentCustomerProjects] Database error: ${error.message}`, error.stack);
      throw new HttpException('Failed to fetch projects', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Find projects in a specific org where an agent is the linked customer.
   * Used when agent accesses a non-personal org without membership.
   */
  private async findAgentCustomerProjectsInOrg(user: AuthenticatedUser, orgId: string) {
    this.logger.debug(`[findAgentCustomerProjectsInOrg] Querying customer projects in org | userId=${user.id} orgId=${orgId}`);

    try {
      // Find customer records for this user in this specific org
      const customerRecords = await this.prisma.organizationCustomer.findMany({
        where: {
          userId: user.id,
          orgId: orgId,
        },
        select: { id: true },
      });
      const customerIds = customerRecords.map((c) => c.id);

      this.logger.debug(`[findAgentCustomerProjectsInOrg] Found ${customerIds.length} customer records | userId=${user.id} orgId=${orgId}`);

      if (customerIds.length === 0) {
        // No customer records in this org - return empty (not forbidden)
        // The user might legitimately have no projects yet
        this.logger.debug(`[findAgentCustomerProjectsInOrg] SUCCESS: No customer records in org, returning empty | userId=${user.id} orgId=${orgId}`);
        return [];
      }

      const include = this.projectInclude(true);
      const projects = await this.prisma.project.findMany({
        where: {
          orgId,
          customerId: { in: customerIds },
        },
        include: {
          ...include,
          organization: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.debug(`[findAgentCustomerProjectsInOrg] SUCCESS: Returned ${projects.length} projects | userId=${user.id} orgId=${orgId}`);
      return projects;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`[findAgentCustomerProjectsInOrg] Database error: ${error.message}`, error.stack);
      throw new HttpException('Failed to fetch projects', HttpStatus.INTERNAL_SERVER_ERROR);
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

  // =============================
  // Project CRUD
  // =============================

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
    // Use findProjectForUserAccess to allow agents to view their customer-linked projects
    const project = await this.findProjectForUserAccess(
      id,
      ctx,
      user,
      this.projectInclude(true),
    );

    if (!this.authorization.canViewProject(ctx, project, user)) {
      throw new ForbiddenException('You are not allowed to view this project');
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, ctx: OrgContext, user: AuthenticatedUser) {
    const project = await this.ensureProjectInOrg(id, ctx);
    
    // Use canEditProject which enforces PM assignment check
    if (!this.authorization.canEditProject(ctx, project, user)) {
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

    // Use canDeleteProject - only OWNER/ADMIN can delete, never PM
    if (!this.authorization.canDeleteProject(ctx, project)) {
      throw new ForbiddenException('You cannot delete this project');
    }

    // Remove calendar event if technician was assigned
    if (project.technicianId) {
      try {
        await this.calendarSync.removeProjectFromCalendar(id);
      } catch (error) {
        this.logger.warn(`Failed to remove calendar event on project delete: ${error.message}`);
      }
    }

    return this.prisma.project.delete({ where: { id } });
  }

  // =============================
  // Project assignments
  // =============================

  async assign(projectId: string, dto: AssignProjectDto, ctx: OrgContext, user: AuthenticatedUser) {
    const project = await this.ensureProjectInOrg(projectId, ctx);
    
    // Use canEditProject which enforces PM assignment check
    if (!this.authorization.canEditProject(ctx, project, user)) {
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
    user: AuthenticatedUser,
  ) {
    const project = await this.ensureProjectInOrg(projectId, ctx);

    // Use canEditProject which enforces PM assignment check
    if (!this.authorization.canEditProject(ctx, project, user)) {
      throw new ForbiddenException('You cannot manage this project');
    }

    const technician = await this.ensureUserExists(technicianId);

    // Check technician availability if project has a scheduled time
    if (project.scheduledTime) {
      const availabilityCheck = await this.availabilityService.isUserAvailableAt(
        technicianId,
        project.scheduledTime,
      );

      if (!availabilityCheck.available) {
        // Check if auto-decline is enabled
        const availability = await this.availabilityService.getUserAvailability(technicianId);
        if (availability.status.autoDeclineBookings) {
          throw new BadRequestException(
            `Technician is not available: ${availabilityCheck.reason}`,
          );
        }
        // Log warning but allow assignment if auto-decline is not enabled
        this.logger.warn(
          `Assigning technician ${technicianId} to project ${projectId} outside their availability: ${availabilityCheck.reason}`,
        );
      }
    }

    // Check if this is a new assignment (different from current)
    const isNewAssignment = project.technicianId !== technicianId;

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { technicianId },
      include: this.projectInclude(true),
    });

    if (project.scheduledTime && process.env.CRONOFY_ACCESS_TOKEN) {
      await this.cronofy.createEvent(updated, technician);
    }

    // Sync to Nylas calendar if technician has a connected calendar
    if (project.scheduledTime) {
      // If there was a previous technician, remove from their calendar
      if (project.technicianId && project.technicianId !== technicianId) {
        try {
          await this.calendarSync.removeProjectFromCalendar(projectId);
        } catch (error) {
          this.logger.warn(`Failed to remove calendar event from previous technician: ${error.message}`);
        }
      }
      // Sync to new technician's calendar
      try {
        await this.calendarSync.syncProjectToCalendar(projectId);
      } catch (error) {
        this.logger.warn(`Failed to sync calendar event for technician: ${error.message}`);
      }
    }

    // Create notification for the newly assigned technician
    if (isNewAssignment) {
      await this.createAssignmentNotification(
        technicianId,
        projectId,
        ctx.org.id,
        'TECHNICIAN',
        updated,
      );
    }

    return updated;
  }

  async assignCustomer(
    projectId: string,
    customerId: string | null,
    ctx: OrgContext,
  ) {
    const project = await this.ensureProjectInOrg(projectId, ctx);
    
    // Use canChangeProjectCustomer - only OWNER/ADMIN can change customer
    if (!this.authorization.canChangeProjectCustomer(ctx, project)) {
      throw new ForbiddenException('You cannot change the customer on this project');
    }

    // Only validate customer exists if assigning (not unassigning)
    let customer: { userId?: string | null } | null = null;
    if (customerId) {
      customer = await this.ensureCustomerInOrg(customerId, ctx);
    }

    // Check if this is a new assignment (different from current)
    const isNewAssignment = customerId && project.customerId !== customerId;

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { customerId },
      include: this.projectInclude(true),
    });

    // Create notification for the customer if they have a linked user account
    if (isNewAssignment && customer?.userId) {
      await this.createAssignmentNotification(
        customer.userId,
        projectId,
        ctx.org.id,
        'CUSTOMER',
        project,
      );
    }

    return updated;
  }

  async assignEditor(projectId: string, editorId: string | null, ctx: OrgContext, user: AuthenticatedUser) {
    const project = await this.ensureProjectInOrg(projectId, ctx);
    
    // Use canEditProject which enforces PM assignment check
    if (!this.authorization.canEditProject(ctx, project, user)) {
      throw new ForbiddenException('You cannot manage this project');
    }

    // Only validate user exists if assigning (not unassigning)
    if (editorId) {
      await this.ensureUserExists(editorId);
    }

    // Check if this is a new assignment (different from current)
    const isNewAssignment = editorId && project.editorId !== editorId;

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { editorId },
    });

    // Create notification for the newly assigned editor
    if (isNewAssignment && editorId) {
      await this.createAssignmentNotification(
        editorId,
        projectId,
        ctx.org.id,
        'EDITOR',
        project,
      );
    }

    return updated;
  }

  async assignProjectManager(
    projectId: string,
    projectManagerId: string | null,
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    const project = await this.ensureProjectInOrg(projectId, ctx);
    
    // Use canEditProject which enforces PM assignment check
    if (!this.authorization.canEditProject(ctx, project, user)) {
      throw new ForbiddenException('You cannot manage this project');
    }

    // Only validate user exists if assigning (not unassigning)
    if (projectManagerId) {
      await this.ensureUserExists(projectManagerId);
    }

    // Check if this is a new assignment (different from current)
    const isNewAssignment = projectManagerId && project.projectManagerId !== projectManagerId;

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { projectManagerId },
    });

    // Create notification for the newly assigned project manager
    if (isNewAssignment && projectManagerId) {
      await this.createAssignmentNotification(
        projectManagerId,
        projectId,
        ctx.org.id,
        'PROJECT_MANAGER',
        project,
      );
    }

    return updated;
  }

  // =============================
  // Project scheduling
  // =============================

  async scheduleProject(
    projectId: string,
    scheduled: Date,
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    const project = await this.ensureProjectInOrg(projectId, ctx);
    
    // Use canEditProject which enforces PM assignment check
    if (!this.authorization.canEditProject(ctx, project, user)) {
      throw new ForbiddenException('You cannot manage this project');
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        scheduledTime: scheduled,
        // Clear any calendar conflict when schedule is updated
        calendarConflict: false,
        calendarConflictNote: null,
      },
    });

    const event = await this.prisma.calendarEvent.findUnique({
      where: { projectId },
    });

    if (event && process.env.CRONOFY_ACCESS_TOKEN) {
      await this.cronofy.updateEvent(updated, event);
    }

    // Sync to Nylas calendar if technician has a connected calendar
    if (project.technicianId) {
      try {
        await this.calendarSync.syncProjectToCalendar(projectId);
      } catch (error) {
        this.logger.warn(`Failed to sync calendar event for schedule update: ${error.message}`);
      }
    }

    return updated;
  }

  // =============================
  // Project status
  // =============================

  async updateStatus(
    projectId: string,
    newStatus: ProjectStatus,
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    const project = await this.ensureProjectInOrg(projectId, ctx);
    const current = project.status;

    // Users who can edit the project can change status freely
    if (this.authorization.canEditProject(ctx, project, user)) {
      return this.setProjectStatus(projectId, newStatus);
    }

    // TECHNICIAN/EDITOR can only make limited status transitions on their assigned projects
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
    // When status changes to DELIVERED, also set deliveryEnabledAt
    const data: any = { status };
    if (status === ProjectStatus.DELIVERED) {
      data.deliveryEnabledAt = new Date();
    }

    // If cancelling, remove calendar event
    if (status === ProjectStatus.CANCELLED) {
      try {
        await this.calendarSync.removeProjectFromCalendar(projectId);
      } catch (error) {
        this.logger.warn(`Failed to remove calendar event on cancellation: ${error.message}`);
      }
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data,
    });
  }

  // =============================
  // Project messaging
  // =============================

  async getMessages(
    projectId: string,
    ctx: OrgContext,
    user: AuthenticatedUser,
    channel: ProjectChatChannel = ProjectChatChannel.TEAM,
  ) {
    // Use findProjectForUserAccess to allow agents to access their customer-linked projects
    const project = await this.findProjectForUserAccess(projectId, ctx, user, {
      technician: true,
      editor: true,
      projectManager: true,
      customer: true,
    });

    if (!this.authorization.canViewProject(ctx, project, user)) {
      throw new ForbiddenException('Not allowed');
    }

    // Check read permission based on channel
    // EDITOR/TECHNICIAN cannot read customer chat
    if (channel === ProjectChatChannel.CUSTOMER) {
      if (!this.authorization.canReadCustomerChat(ctx, project, user)) {
        throw new ForbiddenException('Not allowed to view this channel');
      }
    } else {
      if (!this.authorization.canReadTeamChat(ctx, project, user)) {
        throw new ForbiddenException('Not allowed to view this channel');
      }
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
    // Use findProjectForUserAccess to allow agents to post to their customer-linked projects
    const project = await this.findProjectForUserAccess(projectId, ctx, user, {
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

  // =============================
  // Delivery management
  // =============================

  /**
   * Enable delivery for a project.
   * Returns the delivery token that can be used to access the delivery page.
   */
  async enableDelivery(projectId: string, ctx: OrgContext, user: AuthenticatedUser) {
    // Get project with customer info for email notification
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId: ctx.org.id },
      include: {
        customer: true,
        organization: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Only managers can enable delivery
    if (!this.authorization.canEditProject(ctx, project, user)) {
      throw new ForbiddenException('You cannot manage delivery for this project');
    }

    // Generate a delivery token if one doesn't exist (for legacy projects)
    const { randomUUID } = await import('crypto');
    const deliveryToken = project.deliveryToken || randomUUID();

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        deliveryEnabledAt: new Date(),
        deliveryToken: deliveryToken,
      },
      select: {
        id: true,
        deliveryToken: true,
        deliveryEnabledAt: true,
        clientApprovalStatus: true,
      },
    });

    // Create delivery notification for the customer (agent)
    try {
      await this.notifications.createDeliveryNotification(
        projectId,
        ctx.org.id,
        updated.deliveryToken!,
      );
    } catch (error: any) {
      this.logger.warn(`Failed to create delivery notification: ${error.message}`);
    }

    // Send delivery email to customer if they have an email address
    // Fire-and-forget: don't await, don't fail the request
    if (project.customer?.email) {
      const projectAddress = this.buildProjectAddress(project);
      this.emailService.sendDeliveryEmail(
        project.customer.email,
        project.customer.name || '',
        project.organization.name,
        projectAddress,
        updated.deliveryToken!,
      ).then((sent) => {
        if (sent) {
          this.logger.log(`Delivery email sent to ${project.customer!.email} for project ${projectId}`);
        } else {
          this.logger.warn(`Delivery email failed to send to ${project.customer!.email}`);
        }
      }).catch((emailError) => {
        this.logger.error(`Failed to send delivery email to ${project.customer!.email}:`, emailError);
      });
    }

    return {
      enabled: true,
      deliveryToken: updated.deliveryToken,
      deliveryEnabledAt: updated.deliveryEnabledAt,
      clientApprovalStatus: updated.clientApprovalStatus,
    };
  }

  /**
   * Build a project address string from project fields.
   */
  private buildProjectAddress(project: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
  }): string {
    const parts = [
      project.addressLine1,
      project.addressLine2,
      project.city,
      project.region,
      project.postalCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Project';
  }

  /**
   * Disable delivery for a project.
   * The delivery token remains but the page won't be accessible.
   */
  async disableDelivery(projectId: string, ctx: OrgContext, user: AuthenticatedUser) {
    const project = await this.ensureProjectInOrg(projectId, ctx);

    // Only managers can disable delivery
    if (!this.authorization.canEditProject(ctx, project, user)) {
      throw new ForbiddenException('You cannot manage delivery for this project');
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        deliveryEnabledAt: null,
      },
    });

    return {
      enabled: false,
      deliveryToken: project.deliveryToken,
      deliveryEnabledAt: null,
    };
  }

  /**
   * Regenerate the delivery token for a project.
   * This invalidates any existing delivery links.
   */
  async regenerateDeliveryToken(projectId: string, ctx: OrgContext, user: AuthenticatedUser) {
    const project = await this.ensureProjectInOrg(projectId, ctx);

    // Only managers can regenerate delivery token
    if (!this.authorization.canEditProject(ctx, project, user)) {
      throw new ForbiddenException('You cannot manage delivery for this project');
    }

    const { randomUUID } = await import('crypto');
    const newToken = randomUUID();

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        deliveryToken: newToken,
      },
      select: {
        id: true,
        deliveryToken: true,
        deliveryEnabledAt: true,
        clientApprovalStatus: true,
      },
    });

    return {
      enabled: !!updated.deliveryEnabledAt,
      deliveryToken: updated.deliveryToken,
      deliveryEnabledAt: updated.deliveryEnabledAt,
      clientApprovalStatus: updated.clientApprovalStatus,
    };
  }

  /**
   * Get delivery status for a project.
   */
  async getDeliveryStatus(projectId: string, ctx: OrgContext, user: AuthenticatedUser) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId: ctx.org.id },
      include: {
        customer: true,
        clientApprovedBy: true,
      },
    });

    if (!project) {
      throw new ForbiddenException('Project does not belong to your organization');
    }

    if (!this.authorization.canViewProject(ctx, project, user)) {
      throw new ForbiddenException('You cannot view this project');
    }

    return {
      enabled: !!project.deliveryEnabledAt,
      deliveryToken: project.deliveryToken,
      deliveryEnabledAt: project.deliveryEnabledAt,
      clientApprovalStatus: project.clientApprovalStatus,
      clientApprovedAt: project.clientApprovedAt,
      clientApprovedBy: project.clientApprovedBy
        ? { id: project.clientApprovedBy.id, name: project.clientApprovedBy.name }
        : null,
    };
  }
}
