import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { OrgRole, Role, OrgType } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    // Fetch global user role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true },
    });

    if (!user) throw new NotFoundException('User not found');

    // ENFORCEMENT: only global ADMIN can create organizations
    if (user.role !== Role.DISPATCHER) {
      throw new ForbiddenException(
        'Only ADMIN users can create a media company',
      );
    }

    // Create the organization
    const org = await this.prisma.organization.create({
      data: {
        id: randomUUID(),
        name: dto.name,
      },
    });

    // Make the creator an OrgRole.DISPATCHER
    await this.prisma.organizationMember.create({
      data: {
        userId,
        orgId: org.id,
        role: OrgRole.DISPATCHER,
      },
    });

    return org;
  }

  async listUserOrganizations(userId: string) {
    return this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });
  }

  async createInvite(orgId: string, dto: CreateInviteDto, inviterId: string) {
    // Ensure org exists
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const token = randomUUID();

    return this.prisma.invitation.create({
      data: {
        orgId,
        email: dto.email,
        role: dto.role,
        token,
      },
    });
  }

  async acceptInvite(userId: string, dto: AcceptInviteDto) {
    const invite = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invite.accepted) return invite;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Check if already a member
    const existing = await this.prisma.organizationMember.findFirst({
      where: { userId, orgId: invite.orgId },
    });

    if (!existing) {
      await this.prisma.organizationMember.create({
        data: {
          userId,
          orgId: invite.orgId,
          role: invite.role,
        },
      });
    }

    await this.prisma.invitation.update({
      where: { id: invite.id },
      data: { accepted: true },
    });

    return invite;
  }

  async getOrganizationById(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async updateOrganizationSettings(
    orgId: string,
    dto: UpdateOrganizationSettingsDto,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Build update data object, only including fields that are provided
    const updateData: any = {};
    if (dto.legalName !== undefined) updateData.legalName = dto.legalName;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.websiteUrl !== undefined) updateData.websiteUrl = dto.websiteUrl;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.primaryEmail !== undefined)
      updateData.primaryEmail = dto.primaryEmail;
    if (dto.addressLine1 !== undefined)
      updateData.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined)
      updateData.addressLine2 = dto.addressLine2;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.region !== undefined) updateData.region = dto.region;
    if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode;
    if (dto.countryCode !== undefined) updateData.countryCode = dto.countryCode;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.serviceArea !== undefined) updateData.serviceArea = dto.serviceArea;

    return this.prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });
  }

  async listOrganizationMembers(orgId: string) {
    const members = await this.prisma.organizationMember.findMany({
      where: { orgId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const technicianIds = members
      .filter((m) => m.user?.role === Role.TECHNICIAN)
      .map((m) => m.userId);

    // Ensure each technician has a personal org
    for (const techId of technicianIds) {
      const personalMembership = await this.prisma.organizationMember.findFirst({
        where: {
          userId: techId,
          organization: { type: OrgType.PERSONAL },
        },
      });

      if (!personalMembership) {
        const techUser = await this.prisma.user.findUnique({ where: { id: techId } });
        const personalOrg = await this.prisma.organization.create({
          data: {
            id: randomUUID(),
            name: `${techUser?.name || 'Technician'}'s Workspace`,
            type: OrgType.PERSONAL,
          },
        });
        await this.prisma.organizationMember.create({
          data: {
            userId: techId,
            orgId: personalOrg.id,
            role: OrgRole.DISPATCHER,
          },
        });
      }
    }

    const personalOrgs = technicianIds.length
      ? await this.prisma.organization.findMany({
          where: {
            type: OrgType.PERSONAL,
            members: { some: { userId: { in: technicianIds } } },
          },
          include: { members: true },
        })
      : [];

    return members.map((member) => {
      const personalOrg = member.userId
        ? personalOrgs.find((org) =>
            org.members.some((m) => m.userId === member.userId),
          )
        : undefined;

      return {
        ...member,
        personalOrg,
      };
    });
  }
}
