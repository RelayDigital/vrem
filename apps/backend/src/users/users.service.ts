import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserAccountType } from '@prisma/client';

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
}
