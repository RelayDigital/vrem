import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserAccountType, ProviderUseCaseType, OrgType, OrgRole } from '@prisma/client';

/**
 * Org metadata returned for org switcher display
 */
interface OrgMetadata {
  id: string;
  name: string;
  type: OrgType;
  logoUrl: string | null;
}

/**
 * Membership entry for org switcher
 */
interface OrgContextMembership {
  orgId: string;
  role: OrgRole;
  organization: OrgMetadata;
  createdAt: Date;
}

/**
 * Customer relationship entry for agents
 */
interface CustomerOfOrg {
  orgId: string;
  customerId: string;
  organization: OrgMetadata;
  createdAt: Date;
}

/**
 * Full org context response for org switcher
 */
export interface OrgContextResponse {
  /** Personal org - always present */
  personalOrg: OrgMetadata;
  /** Team and Company org memberships with role */
  memberships: OrgContextMembership[];
  /** For AGENT accounts: orgs where they are a customer */
  customerOfOrgs: CustomerOfOrg[];
  /** Account type (determines which fields are relevant) */
  accountType: UserAccountType;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const hashed = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashed,
        accountType: dto.accountType,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByRole(role: UserAccountType) {
    return this.prisma.user.findMany({
      where: { accountType: role },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.findOne(id);
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    // If name changed, update personal organization name to "<User Name>'s Workspace"
    if (dto.name && dto.name !== existing.name) {
      const personalMembership = await this.prisma.organizationMember.findFirst({
        where: {
          userId: id,
          role: 'OWNER',
          organization: { type: 'PERSONAL' },
        },
        include: { organization: true },
      });

      if (personalMembership?.organization) {
        await this.prisma.organization.update({
          where: { id: personalMembership.organization.id },
          data: {
            name: `${dto.name}'s Workspace`,
          },
        });
      }
    }

    return updatedUser;
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }

  /**
   * Deactivate a user's account (soft delete)
   * Sets deactivatedAt timestamp, user can no longer log in
   */
  async deactivateAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, deactivatedAt: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.deactivatedAt) {
      throw new BadRequestException('Account is already deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ForbiddenException('Invalid password');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { deactivatedAt: new Date() },
      select: {
        id: true,
        email: true,
        name: true,
        deactivatedAt: true,
      },
    });
  }

  /**
   * Reactivate a previously deactivated account
   */
  async reactivateAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deactivatedAt: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.deactivatedAt) {
      throw new BadRequestException('Account is not deactivated');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { deactivatedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        deactivatedAt: true,
      },
    });
  }

  /**
   * Permanently delete a user's account and all associated data
   * This is a destructive operation that cannot be undone
   */
  async deleteAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        organizations: {
          select: {
            orgId: true,
            role: true,
            organization: { select: { type: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ForbiddenException('Invalid password');
    }

    // Check if user is the sole owner of any COMPANY organizations
    for (const membership of user.organizations) {
      if (membership.role === 'OWNER' && membership.organization.type === 'COMPANY') {
        // Count other owners in the organization
        const ownerCount = await this.prisma.organizationMember.count({
          where: {
            orgId: membership.orgId,
            role: 'OWNER',
            userId: { not: userId },
          },
        });

        if (ownerCount === 0) {
          throw new BadRequestException(
            'Cannot delete account while you are the sole owner of an organization. Please transfer ownership or delete the organization first.',
          );
        }
      }
    }

    // Delete in a transaction to ensure data consistency
    return this.prisma.$transaction(async (tx) => {
      // Find and delete user's personal organization
      const personalOrg = await tx.organizationMember.findFirst({
        where: {
          userId,
          organization: { type: 'PERSONAL' },
        },
        select: { orgId: true },
      });

      if (personalOrg) {
        // Delete all projects in the personal org
        await tx.project.deleteMany({ where: { orgId: personalOrg.orgId } });
        // Delete all customers in the personal org
        await tx.organizationCustomer.deleteMany({ where: { orgId: personalOrg.orgId } });
        // Delete invitations
        await tx.invitation.deleteMany({ where: { orgId: personalOrg.orgId } });
        // Delete notifications for the personal org
        await tx.notification.deleteMany({ where: { orgId: personalOrg.orgId } });
        // Delete organization memberships
        await tx.organizationMember.deleteMany({ where: { orgId: personalOrg.orgId } });
        // Delete the personal organization
        await tx.organization.delete({ where: { id: personalOrg.orgId } });
      }

      // Remove user from other organizations (not delete them)
      await tx.organizationMember.deleteMany({ where: { userId } });

      // Unlink customer records (don't delete the customer, just remove user link)
      await tx.organizationCustomer.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // Delete user-related data that cascades
      // Many of these have onDelete: Cascade, but we'll be explicit for clarity
      await tx.tourProgress.deleteMany({ where: { userId } });
      await tx.tourStatus.deleteMany({ where: { userId } });
      await tx.providerUseCase.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.messageRead.deleteMany({ where: { userId } });

      // Finally, delete the user
      await tx.user.delete({ where: { id: userId } });

      return { success: true, message: 'Account deleted successfully' };
    });
  }

  /**
   * Get the use cases (services) for a user
   */
  async getUseCases(userId: string): Promise<ProviderUseCaseType[]> {
    const useCases = await this.prisma.providerUseCase.findMany({
      where: { userId },
      select: { useCase: true },
    });

    return useCases.map((uc) => uc.useCase);
  }

  /**
   * Update the use cases (services) for a user
   * Replaces all existing use cases with the new set
   */
  async updateUseCases(
    userId: string,
    useCases: ProviderUseCaseType[],
  ): Promise<ProviderUseCaseType[]> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, accountType: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only providers can have use cases
    if (user.accountType !== UserAccountType.PROVIDER) {
      throw new BadRequestException('Only provider accounts can have use cases');
    }

    // Use a transaction to replace all use cases
    await this.prisma.$transaction(async (tx) => {
      // Delete existing use cases
      await tx.providerUseCase.deleteMany({
        where: { userId },
      });

      // Create new use cases
      await tx.providerUseCase.createMany({
        data: useCases.map((useCase) => ({
          userId,
          useCase,
        })),
      });
    });

    return useCases;
  }

  /**
   * Get the org context for the current user.
   * This is the canonical endpoint for the org switcher UI.
   *
   * Returns:
   * - personalOrg: Always present, the user's personal workspace
   * - memberships: TEAM and COMPANY orgs where user is a member (with role)
   * - customerOfOrgs: For AGENT accounts, orgs where they are linked as a customer
   */
  async getOrgContext(userId: string): Promise<OrgContextResponse> {
    // Get user with account type
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, accountType: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all memberships
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Find personal org
    const personalMembership = memberships.find(
      (m) => m.organization.type === OrgType.PERSONAL,
    );

    if (!personalMembership) {
      // This should never happen - all users should have a personal org
      throw new NotFoundException('Personal organization not found');
    }

    const personalOrg: OrgMetadata = {
      id: personalMembership.organization.id,
      name: personalMembership.organization.name,
      type: personalMembership.organization.type,
      logoUrl: personalMembership.organization.logoUrl,
    };

    // Build memberships list (TEAM and COMPANY orgs only)
    const orgMemberships: OrgContextMembership[] = memberships
      .filter((m) => m.organization.type !== OrgType.PERSONAL)
      .map((m) => ({
        orgId: m.orgId,
        role: m.role,
        organization: {
          id: m.organization.id,
          name: m.organization.name,
          type: m.organization.type,
          logoUrl: m.organization.logoUrl,
        },
        createdAt: m.createdAt,
      }));

    // For AGENT accounts, get customer relationships
    let customerOfOrgs: CustomerOfOrg[] = [];
    if (user.accountType === UserAccountType.AGENT) {
      const customerRelations = await this.prisma.organizationCustomer.findMany({
        where: { userId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              type: true,
              logoUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Filter out orgs where user is already a member
      const memberOrgIds = new Set(memberships.map((m) => m.orgId));
      customerOfOrgs = customerRelations
        .filter((c) => !memberOrgIds.has(c.orgId))
        .map((c) => ({
          orgId: c.orgId,
          customerId: c.id,
          organization: {
            id: c.organization.id,
            name: c.organization.name,
            type: c.organization.type,
            logoUrl: c.organization.logoUrl,
          },
          createdAt: c.createdAt,
        }));
    }

    return {
      personalOrg,
      memberships: orgMemberships,
      customerOfOrgs,
      accountType: user.accountType,
    };
  }
}
