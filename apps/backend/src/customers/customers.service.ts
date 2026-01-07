import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  OrgType,
  OrgRole,
  InvitationType,
  InvitationStatus,
  NotificationType,
} from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private authorization: AuthorizationService,
  ) {}

  /**
   * Ensure user can manage customers (create/edit/delete).
   * Only OWNER and ADMIN can manage customers at the CRM level.
   * PROJECT_MANAGER is intentionally excluded - customer data is commercial, not operational.
   */
  private ensureCanManage(ctx: OrgContext, user: AuthenticatedUser) {
    if (!this.authorization.canManageCustomers(ctx, user)) {
      throw new ForbiddenException('You are not allowed to manage customers');
    }
  }

  /**
   * Ensure user can view customers (read-only access).
   * OWNER, ADMIN, and PROJECT_MANAGER can view customers for project context.
   */
  private ensureCanView(ctx: OrgContext, user: AuthenticatedUser) {
    if (!this.authorization.canViewCustomers(ctx, user)) {
      throw new ForbiddenException('You are not allowed to view customers');
    }
  }

  async listForOrg(ctx: OrgContext, user: AuthenticatedUser, search?: string) {
    // PROJECT_MANAGER can view customers for project context, but not edit them
    this.ensureCanView(ctx, user);
    const orgId = ctx.org.id;
    const customers = await this.prisma.organizationCustomer.findMany({
      where: {
        orgId,
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        projects: {
          select: { id: true, scheduledTime: true },
        },
        user: {
          select: { avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return customers.map((customer) => {
      const totalJobs = customer.projects.length;
      const lastJobDate = customer.projects.reduce(
        (latest: Date | null, proj) => {
          if (!proj.scheduledTime) return latest;
          const current = new Date(proj.scheduledTime);
          if (!latest || current > latest) return current;
          return latest;
        },
        null as Date | null,
      );

      return {
        id: customer.id,
        orgId: customer.orgId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        notes: customer.notes,
        userId: customer.userId,
        avatar: customer.user?.avatarUrl || null,
        totalJobs,
        lastJob: lastJobDate,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      };
    });
  }

  async create(ctx: OrgContext, user: AuthenticatedUser, dto: CreateCustomerDto) {
    // Only OWNER/ADMIN can create customers
    this.ensureCanManage(ctx, user);
    const orgId = ctx.org.id;
    const orgType = ctx.org.type;

    // Optional: ensure linked agent user exists
    let linkedUserName: string | undefined;
    if (dto.userId) {
      const linkedUser = await this.prisma.user.findUnique({ where: { id: dto.userId } });
      if (!linkedUser) {
        throw new NotFoundException('Linked user not found');
      }
      linkedUserName = linkedUser.name;
    }

    // For COMPANY orgs: check if the email belongs to an existing user
    // If so, send an invitation instead of creating the customer directly
    if (orgType === OrgType.COMPANY && dto.email && !dto.userId) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });

      if (existingUser) {
        // Check if there's already a pending invitation for this user/org
        const existingInvite = await this.prisma.invitation.findFirst({
          where: {
            email: dto.email.toLowerCase(),
            orgId,
            inviteType: InvitationType.CUSTOMER,
            status: InvitationStatus.PENDING,
          },
        });

        if (existingInvite) {
          // Return info about existing pending invite
          return {
            type: 'invitation_pending',
            message: `An invitation is already pending for ${dto.email}`,
            invitationId: existingInvite.id,
          };
        }

        // Check if user is already a customer of this org (by userId OR by email)
        const existingCustomer = await this.prisma.organizationCustomer.findFirst({
          where: {
            orgId,
            OR: [
              { userId: existingUser.id },
              { email: { equals: dto.email, mode: 'insensitive' } },
            ],
          },
        });

        if (existingCustomer) {
          // If customer exists by email but not linked to user, link them now
          if (!existingCustomer.userId) {
            await this.prisma.organizationCustomer.update({
              where: { id: existingCustomer.id },
              data: { userId: existingUser.id },
            });
            return {
              type: 'existing_customer_linked',
              message: `${dto.email} was already a customer and has now been linked to their account`,
              customer: { ...existingCustomer, userId: existingUser.id },
            };
          }
          // Return the existing customer
          return {
            type: 'existing_customer',
            message: `${dto.email} is already a customer of this organization`,
            customer: existingCustomer,
          };
        }

        // Create an invitation for the existing user
        const token = randomUUID();
        const invitation = await this.prisma.invitation.create({
          data: {
            orgId,
            email: dto.email.toLowerCase(),
            role: OrgRole.AGENT, // Default role for customer invites
            inviteType: InvitationType.CUSTOMER,
            status: InvitationStatus.PENDING,
            token,
          },
        });

        // Create a notification for the user
        await this.prisma.notification.create({
          data: {
            userId: existingUser.id,
            orgId,
            type: NotificationType.INVITATION_CUSTOMER,
            invitationId: invitation.id,
          },
        });

        return {
          type: 'invitation_sent',
          message: `Invitation sent to ${dto.email}. They will appear as a customer once they accept.`,
          invitationId: invitation.id,
          invitedUser: {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
          },
        };
      }
    }

    // If an agent is linked, always use their name; otherwise, fall back to provided name/email
    const name = linkedUserName || dto.name?.trim() || dto.email || 'Customer';

    const customer = await this.prisma.organizationCustomer.create({
      data: {
        orgId,
        name,
        email: dto.email,
        phone: dto.phone,
        notes: dto.notes,
        userId: dto.userId,
      },
    });

    return {
      type: 'customer_created',
      customer,
    };
  }

  async ensureCustomerInOrg(customerId: string, orgId: string) {
    const customer = await this.prisma.organizationCustomer.findFirst({ where: { id: customerId, orgId } });
    if (!customer) {
      throw new ForbiddenException('Customer does not belong to your organization');
    }
    return customer;
  }

  async update(ctx: OrgContext, user: AuthenticatedUser, customerId: string, dto: UpdateCustomerDto) {
    // Only OWNER/ADMIN can update customers
    this.ensureCanManage(ctx, user);
    const orgId = ctx.org.id;
    await this.ensureCustomerInOrg(customerId, orgId);

    return this.prisma.organizationCustomer.update({
      where: { id: customerId },
      data: {
        name: dto.name?.trim(),
        email: dto.email,
        phone: dto.phone,
        notes: dto.notes,
      },
    });
  }

  async delete(ctx: OrgContext, user: AuthenticatedUser, customerId: string) {
    // Only OWNER/ADMIN can delete customers
    this.ensureCanManage(ctx, user);
    await this.ensureCustomerInOrg(customerId, ctx.org.id);
    await this.prisma.organizationCustomer.delete({ where: { id: customerId } });
    return { success: true };
  }
}
