import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async listForOrg(orgId: string, search?: string) {
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
      const lastJobDate =
        customer.projects.reduce<Date | null>((latest, proj) => {
          if (!proj.scheduledTime) return latest;
          const current = new Date(proj.scheduledTime);
          if (!latest || current > latest) return current;
          return latest;
        }, null) || null;

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

  async create(orgId: string, dto: CreateCustomerDto) {
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

  async update(orgId: string, customerId: string, dto: UpdateCustomerDto) {
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

  async delete(orgId: string, customerId: string) {
    await this.ensureCustomerInOrg(customerId, orgId);
    await this.prisma.organizationCustomer.delete({ where: { id: customerId } });
    return { success: true };
  }
}
