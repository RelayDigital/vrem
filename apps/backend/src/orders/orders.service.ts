import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma, OrgType, CalendarEvent, PendingOrderStatus, ProjectStatus, PaymentMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CronofyService } from '../cronofy/cronofy.service';
import { AuthorizationService } from '../auth/authorization.service';
import { StripeService } from '../stripe/stripe.service';
import { PackagesService } from '../packages/packages.service';
import { NylasService } from '../nylas/nylas.service';
import { CalendarSyncService } from '../nylas/calendar-sync.service';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { CreateOrderDto, SchedulingMode } from './dto/create-order.dto';
import { OrderResult } from './dto/order-result.dto';
import { EmailService } from '../email/email.service';
import { FRONTEND_URL } from '../config/urls.config';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private cronofy: CronofyService,
    private authorization: AuthorizationService,
    private stripe: StripeService,
    private packages: PackagesService,
    private nylas: NylasService,
    private calendarSync: CalendarSyncService,
    private emailService: EmailService,
  ) {}

  /**
   * Creates a complete order: Customer (if new) + Project + CalendarEvent
   * All operations happen in a single transaction for atomicity.
   *
   * Two flows:
   * 1. Agent flow (providerOrgId set): Agent creates order for a COMPANY org where they are a customer
   *    - Checks provider's paymentMode to determine if payment is required
   * 2. Company flow (no providerOrgId): Company creates order internally with customer info
   */
  async createOrder(
    ctx: OrgContext,
    user: AuthenticatedUser,
    dto: CreateOrderDto,
  ): Promise<OrderResult | { requiresPayment: true; checkoutUrl: string; sessionId: string }> {
    // Determine if this is an agent flow (ordering from a provider)
    const isAgentFlow = !!dto.providerOrgId;

    if (isAgentFlow) {
      // Check provider's payment mode
      const providerOrg = await this.prisma.organization.findUnique({
        where: { id: dto.providerOrgId },
      });

      if (!providerOrg) {
        throw new ForbiddenException('Provider organization not found');
      }

      // If upfront payment required and package selected, redirect to Stripe checkout
      if (providerOrg.paymentMode === PaymentMode.UPFRONT_PAYMENT && dto.packageId) {
        const checkout = await this.createCheckoutSession(ctx, user, dto);
        return {
          requiresPayment: true,
          checkoutUrl: checkout.checkoutUrl,
          sessionId: checkout.sessionId,
        };
      }

      // Otherwise, create order directly (NO_PAYMENT or INVOICE_AFTER_DELIVERY)
      return this.createAgentOrder(user, dto);
    }

    // Standard company flow
    return this.createCompanyOrder(ctx, user, dto);
  }

  /**
   * Agent flow: Create an order for a COMPANY org where the agent is a customer.
   * The project is created under the provider org, with the agent as the customer.
   */
  private async createAgentOrder(
    user: AuthenticatedUser,
    dto: CreateOrderDto,
  ): Promise<OrderResult> {
    // Validate providerOrgId is provided
    if (!dto.providerOrgId) {
      throw new BadRequestException('providerOrgId is required for agent orders');
    }

    // Validate the provider org exists and is a COMPANY
    const providerOrg = await this.prisma.organization.findUnique({
      where: { id: dto.providerOrgId },
    });

    if (!providerOrg) {
      throw new ForbiddenException('Provider organization not found');
    }

    if (providerOrg.type !== OrgType.COMPANY) {
      throw new ForbiddenException('Provider organization must be a COMPANY');
    }

    // Validate the user is a customer of this provider org
    const customerRelation = await this.prisma.organizationCustomer.findFirst({
      where: {
        orgId: dto.providerOrgId,
        userId: user.id,
      },
    });

    if (!customerRelation) {
      throw new ForbiddenException(
        'You are not registered as a customer of this organization',
      );
    }

    // Validate media types
    if (!dto.mediaTypes || dto.mediaTypes.length === 0) {
      throw new BadRequestException('At least one media type must be selected');
    }

    // Geocode address if lat/lng not provided
    const addressData = await this.resolveAddress(dto);

    // Determine project status based on scheduling mode
    const isRequestedScheduling = dto.schedulingMode === SchedulingMode.REQUESTED;
    const projectStatus = isRequestedScheduling ? ProjectStatus.PENDING : ProjectStatus.BOOKED;

    // Execute transaction
    return this.prisma.$transaction(async (tx) => {
      // Create project under the provider org with the agent as customer
      const project = await tx.project.create({
        data: {
          orgId: dto.providerOrgId!,
          customerId: customerRelation.id,
          status: projectStatus,
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
          // No technician assigned - pending for company to assign
          technicianId: null,
          editorId: null,
          // No project manager assigned - company will assign
          projectManagerId: null,
        },
        include: {
          customer: true,
          technician: true,
          editor: true,
          projectManager: true,
        },
      });

      // Fetch the complete project
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

      // Send new order notification email to company owner/admins (fire-and-forget)
      const orgMembers = await tx.organizationMember.findMany({
        where: {
          orgId: dto.providerOrgId!,
          role: { in: ['OWNER', 'ADMIN'] },
        },
        include: { user: true },
      });
      const address = [addressData.addressLine1, addressData.city].filter(Boolean).join(', ') || 'Unknown address';
      for (const member of orgMembers) {
        this.emailService.sendNewOrderEmail(
          member.user.email,
          providerOrg.name,
          customerRelation.name,
          address,
          dto.scheduledTime ? new Date(dto.scheduledTime) : null,
          completeProject!.id,
        ).catch((err) => {
          this.logger.warn(`Failed to send new order email to ${member.user.email}: ${err.message}`);
        });
      }

      return {
        project: completeProject!,
        customer: customerRelation,
        calendarEvent: null,
        isNewCustomer: false,
      };
    });
  }

  /**
   * Company flow: Create an order within the company's own org context.
   */
  private async createCompanyOrder(
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

    // Determine project status based on scheduling mode
    const isRequestedScheduling = dto.schedulingMode === SchedulingMode.REQUESTED;
    const projectStatus = isRequestedScheduling ? ProjectStatus.PENDING : ProjectStatus.BOOKED;

    // Execute transaction
    const result = await this.prisma.$transaction(async (tx) => {
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
          status: projectStatus,
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

    // Sync to Nylas calendar after transaction completes (non-blocking)
    if (result.project.technicianId) {
      this.calendarSync.syncProjectToCalendar(result.project.id).catch((error) => {
        this.logger.warn(`Failed to sync project ${result.project.id} to Nylas calendar: ${error.message}`);
      });
    }

    return result;
  }

  /**
   * Gets the payment mode for a provider organization.
   */
  async getProviderPaymentMode(orgId: string): Promise<{ paymentMode: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { paymentMode: true },
    });

    if (!org) {
      throw new ForbiddenException('Organization not found');
    }

    return { paymentMode: org.paymentMode };
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
      // Check existing VREM project conflicts
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

      // Check external calendar busy times via Nylas
      try {
        const freeBusy = await this.nylas.getFreeBusy(
          dto.technicianId,
          scheduledTime,
          endTime,
        );

        // Check if any busy slot overlaps with our scheduled time
        if (freeBusy?.time_slots) {
          for (const slot of freeBusy.time_slots) {
            if (slot.status === 'busy') {
              throw new ConflictException({
                message: 'Technician has a calendar conflict during this time',
                conflicts: [{
                  type: 'external_calendar',
                  startTime: new Date(slot.start_time * 1000).toISOString(),
                  endTime: new Date(slot.end_time * 1000).toISOString(),
                }],
              });
            }
          }
        }
      } catch (error) {
        // If it's already a ConflictException, rethrow it
        if (error instanceof ConflictException) {
          throw error;
        }
        // Otherwise, log and continue (don't block order if Nylas check fails)
        this.logger.warn(`Failed to check Nylas availability for technician ${dto.technicianId}: ${error.message}`);
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

  /**
   * Creates a Stripe Checkout session for an agent order.
   * This is used when payment is required before creating the project.
   */
  async createCheckoutSession(
    ctx: OrgContext,
    user: AuthenticatedUser,
    dto: CreateOrderDto,
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
    // Only agents can use checkout flow
    if (!dto.providerOrgId) {
      throw new BadRequestException('providerOrgId is required for checkout');
    }

    // Validate the provider org exists and is a COMPANY
    const providerOrg = await this.prisma.organization.findUnique({
      where: { id: dto.providerOrgId },
    });

    if (!providerOrg) {
      throw new ForbiddenException('Provider organization not found');
    }

    if (providerOrg.type !== OrgType.COMPANY) {
      throw new ForbiddenException('Provider organization must be a COMPANY');
    }

    // Validate the user is a customer of this provider org
    const customerRelation = await this.prisma.organizationCustomer.findFirst({
      where: {
        orgId: dto.providerOrgId,
        userId: user.id,
      },
    });

    if (!customerRelation) {
      throw new ForbiddenException(
        'You are not registered as a customer of this organization',
      );
    }

    // Validate media types
    if (!dto.mediaTypes || dto.mediaTypes.length === 0) {
      throw new BadRequestException('At least one media type must be selected');
    }

    // Validate package is selected for checkout
    if (!dto.packageId) {
      throw new BadRequestException('Package selection is required for checkout');
    }

    // Calculate price from package and add-ons with quantities
    const pricing = await this.packages.calculateTotal(
      dto.packageId,
      dto.addOnIds || [],
      dto.addOnQuantities,
    );
    const totalAmount = pricing.total;
    const currency = pricing.currency;

    // Build order description using package name
    const addressParts = [dto.addressLine1, dto.city, dto.region].filter(Boolean);
    const description = `${pricing.breakdown.package.name} at ${addressParts.join(', ')}`;

    // Create PendingOrder
    const pendingOrder = await this.prisma.pendingOrder.create({
      data: {
        stripeSessionId: '', // Will be updated after creating session
        agentUserId: user.id,
        agentCustomerId: customerRelation.id,
        providerOrgId: dto.providerOrgId,
        packageId: dto.packageId,
        selectedAddOnIds: dto.addOnIds || [],
        orderData: {
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          city: dto.city,
          region: dto.region,
          postalCode: dto.postalCode,
          countryCode: dto.countryCode,
          lat: dto.lat,
          lng: dto.lng,
          scheduledTime: dto.scheduledTime,
          notes: dto.notes,
          mediaTypes: dto.mediaTypes,
          priority: dto.priority,
          addOnQuantities: dto.addOnQuantities,
        },
        status: PendingOrderStatus.PENDING_PAYMENT,
        totalAmount,
        currency,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Create Stripe Checkout Session
    const session = await this.stripe.createCheckoutSession({
      pendingOrderId: pendingOrder.id,
      amount: totalAmount,
      currency,
      customerEmail: user.email,
      description,
      successUrl: `${FRONTEND_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${FRONTEND_URL}/booking/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        agentUserId: user.id,
        providerOrgId: dto.providerOrgId,
      },
    });

    // Update PendingOrder with session ID
    await this.prisma.pendingOrder.update({
      where: { id: pendingOrder.id },
      data: { stripeSessionId: session.id },
    });

    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
    };
  }

  /**
   * Cancel or delete an order as the customer (agent).
   * Only the customer who placed the order can cancel/delete it.
   *
   * - PENDING jobs without a technician: Can be fully deleted (hard delete)
   * - PENDING/BOOKED/SHOOTING/EDITING jobs with technician: Can be cancelled (soft cancel)
   * - CANCELLED jobs: Can be deleted (cleanup)
   * - DELIVERED jobs: Cannot be modified
   */
  async cancelOrderAsCustomer(
    projectId: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean; action: 'deleted' | 'cancelled' }> {
    // Find the project
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        customer: true,
        calendarEvent: true,
      },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Verify the user is the customer of this project
    if (!project.customer || project.customer.userId !== user.id) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    // Don't allow modification of delivered projects
    if (project.status === 'DELIVERED') {
      throw new BadRequestException(
        'Cannot modify a project that has been delivered',
      );
    }

    // Determine if this is a delete or cancel:
    // - PENDING without technician = delete
    // - CANCELLED = delete (cleanup)
    // - Otherwise = cancel
    const canDelete =
      (project.status === 'PENDING' && !project.technicianId) ||
      project.status === 'CANCELLED';

    if (canDelete) {
      // Hard delete the project and related records
      await this.prisma.$transaction(async (tx) => {
        // Delete calendar event if exists
        if (project.calendarEvent) {
          await tx.calendarEvent.delete({
            where: { id: project.calendarEvent.id },
          });
        }

        // Delete the project
        await tx.project.delete({
          where: { id: projectId },
        });
      });

      this.logger.log(`Order ${projectId} deleted by customer ${user.id}`);
      return { success: true, action: 'deleted' };
    } else {
      // Soft cancel - update status to CANCELLED
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'CANCELLED' },
      });

      this.logger.log(`Order ${projectId} cancelled by customer ${user.id}`);
      return { success: true, action: 'cancelled' };
    }
  }
}

