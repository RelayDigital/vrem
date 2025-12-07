import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma, OrgType, CalendarEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CronofyService } from '../cronofy/cronofy.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResult } from './dto/order-result.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private cronofy: CronofyService,
    private authorization: AuthorizationService,
  ) {}

  /**
   * Creates a complete order: Customer (if new) + Project + CalendarEvent
   * All operations happen in a single transaction for atomicity.
   */
  async createOrder(
    ctx: OrgContext,
    user: AuthenticatedUser,
    dto: CreateOrderDto,
  ): Promise<OrderResult> {
    // Authorization check
    if (!this.authorization.canCreateOrder(ctx, user)) {
      throw new ForbiddenException('You are not allowed to create orders in this organization');
    }

    // Validate customer input
    if (!dto.customerId && !dto.newCustomer) {
      throw new BadRequestException('Either customerId or newCustomer must be provided');
    }

    // Validate media types
    if (!dto.mediaTypes || dto.mediaTypes.length === 0) {
      throw new BadRequestException('At least one media type must be selected');
    }

    // Check for scheduling conflicts
    await this.checkSchedulingConflicts(ctx, dto);

    // Geocode address if lat/lng not provided
    const addressData = await this.resolveAddress(dto);

    // Execute transaction
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Resolve or create customer
      const { customer, isNewCustomer } = await this.resolveCustomer(
        tx,
        ctx,
        dto,
      );

      // Step 2: Determine technician for PERSONAL orgs
      const technicianId = this.resolveTechnicianId(ctx, user, dto);

      // Step 3: Create project
      const project = await tx.project.create({
        data: {
          orgId: ctx.org.id,
          customerId: customer?.id || null,
          addressLine1: addressData.addressLine1,
          addressLine2: addressData.addressLine2,
          city: addressData.city,
          region: addressData.region,
          postalCode: addressData.postalCode,
          countryCode: addressData.countryCode,
          lat: addressData.lat,
          lng: addressData.lng,
          notes: this.buildNotes(dto),
          scheduledTime: new Date(dto.scheduledTime),
          technicianId: technicianId,
          editorId: dto.editorId,
          projectManagerId: dto.projectManagerId || user.id,
        },
        include: {
          customer: true,
          technician: true,
          editor: true,
          projectManager: true,
        },
      });

      // Step 4: Create calendar event (if technician assigned and Cronofy configured)
      let calendarEvent: CalendarEvent | null = null;
      if (technicianId && process.env.CRONOFY_ACCESS_TOKEN) {
        try {
          const technician = await tx.user.findUnique({
            where: { id: technicianId },
          });
          if (technician) {
            calendarEvent = await this.cronofy.createEvent(project, technician);
          }
        } catch (error) {
          // Log but don't fail the transaction - calendar event is non-critical
          this.logger.warn(
            `Failed to create calendar event for project ${project.id}: ${error.message}`,
          );
        }
      }

      // Fetch the complete project with calendar event
      const completeProject = await tx.project.findUnique({
        where: { id: project.id },
        include: {
          customer: true,
          calendarEvent: true,
          technician: true,
          editor: true,
          projectManager: true,
        },
      });

      return {
        project: completeProject!,
        customer: customer,
        calendarEvent: calendarEvent,
        isNewCustomer,
      };
    });
  }

  /**
   * Resolves or creates a customer based on the DTO
   */
  private async resolveCustomer(
    tx: Prisma.TransactionClient,
    ctx: OrgContext,
    dto: CreateOrderDto,
  ): Promise<{ customer: any | null; isNewCustomer: boolean }> {
    // If customerId provided, verify it belongs to org
    if (dto.customerId) {
      const existing = await tx.organizationCustomer.findFirst({
        where: { id: dto.customerId, orgId: ctx.org.id },
      });
      if (!existing) {
        throw new ForbiddenException('Customer does not belong to your organization');
      }
      return { customer: existing, isNewCustomer: false };
    }

    // Create new customer
    if (dto.newCustomer) {
      // Check for duplicate by email if provided
      if (dto.newCustomer.email) {
        const existingByEmail = await tx.organizationCustomer.findFirst({
          where: {
            orgId: ctx.org.id,
            email: dto.newCustomer.email,
          },
        });
        if (existingByEmail) {
          // Return existing instead of creating duplicate
          return { customer: existingByEmail, isNewCustomer: false };
        }
      }

      const newCustomer = await tx.organizationCustomer.create({
        data: {
          orgId: ctx.org.id,
          name: dto.newCustomer.name,
          email: dto.newCustomer.email,
          phone: dto.newCustomer.phone,
          notes: dto.newCustomer.notes,
        },
      });
      return { customer: newCustomer, isNewCustomer: true };
    }

    return { customer: null, isNewCustomer: false };
  }

  /**
   * Resolves technician ID based on org type and DTO
   */
  private resolveTechnicianId(
    ctx: OrgContext,
    user: AuthenticatedUser,
    dto: CreateOrderDto,
  ): string | undefined {
    // For PERSONAL orgs, the owner is implicitly the technician
    if (ctx.isPersonalOrg) {
      return user.id;
    }

    // For TEAM/COMPANY orgs, use the provided technicianId or leave unassigned
    return dto.technicianId;
  }

  /**
   * Checks for scheduling conflicts
   */
  private async checkSchedulingConflicts(
    ctx: OrgContext,
    dto: CreateOrderDto,
  ): Promise<void> {
    const scheduledTime = new Date(dto.scheduledTime);
    const duration = dto.estimatedDuration || 60; // Default 1 hour
    const endTime = new Date(scheduledTime.getTime() + duration * 60 * 1000);

    // Only check conflicts if a technician is being assigned
    if (dto.technicianId) {
      const conflictingProjects = await this.prisma.project.findMany({
        where: {
          orgId: ctx.org.id,
          technicianId: dto.technicianId,
          scheduledTime: {
            gte: new Date(scheduledTime.getTime() - duration * 60 * 1000),
            lte: endTime,
          },
        },
      });

      if (conflictingProjects.length > 0) {
        throw new ConflictException({
          message: 'Time slot conflict detected',
          conflicts: conflictingProjects.map((p) => ({
            projectId: p.id,
            scheduledTime: p.scheduledTime,
          })),
        });
      }
    }
  }

  /**
   * Resolves address data, geocoding if necessary
   */
  private async resolveAddress(dto: CreateOrderDto): Promise<{
    addressLine1: string;
    addressLine2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    countryCode?: string;
    lat?: number;
    lng?: number;
  }> {
    // If lat/lng already provided, return as-is
    if (dto.lat !== undefined && dto.lng !== undefined) {
      return {
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        region: dto.region,
        postalCode: dto.postalCode,
        countryCode: dto.countryCode,
        lat: dto.lat,
        lng: dto.lng,
      };
    }

    // Attempt geocoding
    const geocoded = await this.geocodeAddress(dto);
    return {
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      city: dto.city || geocoded?.city,
      region: dto.region || geocoded?.region,
      postalCode: dto.postalCode || geocoded?.postalCode,
      countryCode: dto.countryCode || geocoded?.countryCode,
      lat: geocoded?.lat,
      lng: geocoded?.lng,
    };
  }

  /**
   * Geocodes an address using Mapbox
   */
  private async geocodeAddress(dto: CreateOrderDto): Promise<{
    lat?: number;
    lng?: number;
    city?: string;
    region?: string;
    postalCode?: string;
    countryCode?: string;
  } | null> {
    const token =
      process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    if (!token) return null;

    const addressString = [
      dto.addressLine1,
      dto.addressLine2,
      dto.city,
      dto.region,
      dto.postalCode,
      dto.countryCode,
    ]
      .filter(Boolean)
      .join(', ');

    if (!addressString) return null;

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        addressString,
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
        lat,
        lng,
        city: byId('place')?.text || byId('locality')?.text,
        region: byId('region')?.short_code || byId('region')?.text,
        postalCode: byId('postcode')?.text,
        countryCode: byId('country')?.short_code,
      };
    } catch (error) {
      this.logger.error('Geocoding error', error);
      return null;
    }
  }

  /**
   * Builds notes field with metadata
   */
  private buildNotes(dto: CreateOrderDto): string {
    const parts: string[] = [];

    // Add priority if not standard
    if (dto.priority && dto.priority !== 'standard') {
      parts.push(`Priority: ${dto.priority.toUpperCase()}`);
    }

    // Add media types
    if (dto.mediaTypes && dto.mediaTypes.length > 0) {
      parts.push(`Media: ${dto.mediaTypes.join(', ')}`);
    }

    // Add duration if specified
    if (dto.estimatedDuration) {
      parts.push(`Duration: ${dto.estimatedDuration} min`);
    }

    // Add user notes
    if (dto.notes) {
      parts.push(dto.notes);
    }

    return parts.join('\n');
  }

  /**
   * Lists orders (projects) for the organization
   */
  async listOrders(ctx: OrgContext, user: AuthenticatedUser) {
    if (!this.authorization.canCreateOrder(ctx, user)) {
      throw new ForbiddenException('You are not allowed to view orders');
    }

    return this.prisma.project.findMany({
      where: { orgId: ctx.org.id },
      include: {
        customer: true,
        calendarEvent: true,
        technician: true,
        editor: true,
        projectManager: true,
        media: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

