import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private authorization: AuthorizationService,
  ) {}

  private ensureCanManage(ctx: OrgContext, user: AuthenticatedUser) {
    const allowed = [
      'PERSONAL_OWNER',
      'OWNER',
      'ADMIN',
      'PROJECT_MANAGER',
    ];
    if (!allowed.includes(ctx.effectiveRole)) {
      throw new ForbiddenException('You are not allowed to manage customers');
    }
  }

  async listForOrg(ctx: OrgContext, user: AuthenticatedUser, search?: string) {
    this.ensureCanManage(ctx, user);
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
        totalJobs,
        lastJob: lastJobDate,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      };
    });
  }

  async create(ctx: OrgContext, user: AuthenticatedUser, dto: CreateCustomerDto) {
    this.ensureCanManage(ctx, user);
    const orgId = ctx.org.id;
    // Optional: ensure linked agent user exists
    let linkedUserName: string | undefined;
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
      if (!user) {
        throw new NotFoundException('Linked user not found');
      }
      linkedUserName = user.name;
    }

    // If an agent is linked, always use their name; otherwise, fall back to provided name/email
    const name = linkedUserName || dto.name?.trim() || dto.email || 'Customer';

    return this.prisma.organizationCustomer.create({
      data: {
        orgId,
        name,
        email: dto.email,
        phone: dto.phone,
        notes: dto.notes,
        userId: dto.userId,
      },
    });
  }

  async ensureCustomerInOrg(customerId: string, orgId: string) {
    const customer = await this.prisma.organizationCustomer.findFirst({ where: { id: customerId, orgId } });
    if (!customer) {
      throw new ForbiddenException('Customer does not belong to your organization');
    }
    return customer;
  }

  async update(ctx: OrgContext, user: AuthenticatedUser, customerId: string, dto: UpdateCustomerDto) {
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
    this.ensureCanManage(ctx, user);
    await this.ensureCustomerInOrg(customerId, ctx.org.id);
    await this.prisma.organizationCustomer.delete({ where: { id: customerId } });
    return { success: true };
  }
}
