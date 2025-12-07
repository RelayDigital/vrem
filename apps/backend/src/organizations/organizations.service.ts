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
import { OrgRole, OrgType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private authorization: AuthorizationService,
  ) {}

  async createOrganization(
    user: AuthenticatedUser,
    dto: CreateOrganizationDto,
  ) {
    // Determine org type - default to COMPANY if not specified, but prevent PERSONAL creation
    const orgType = dto.type || OrgType.COMPANY;

    // PERSONAL orgs are created automatically during registration, not via this endpoint
    if (orgType === OrgType.PERSONAL) {
      throw new ForbiddenException(
        'Personal organizations are created automatically and cannot be created manually',
      );
    }

    // Use authorization service to check if user can create this type of org
    if (!this.authorization.canCreateOrganization(user, orgType)) {
      throw new ForbiddenException(
        'You are not allowed to create this type of organization',
      );
    }

    // Create the organization with the specified type
    const org = await this.prisma.organization.create({
      data: {
        id: randomUUID(),
        name: dto.name,
        type: orgType,
      },
    });

    // Make the creator an OrgRole.OWNER
    await this.prisma.organizationMember.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: OrgRole.OWNER,
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

  async createInvite(
    ctx: OrgContext,
    dto: CreateInviteDto,
    inviter: AuthenticatedUser,
  ) {
    if (!this.authorization.canManageTeamMembers(ctx, inviter)) {
      throw new ForbiddenException('You cannot invite members to this org');
    }

    const token = randomUUID();

    return this.prisma.invitation.create({
      data: {
        orgId: ctx.org.id,
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

  async getOrganizationById(orgId: string, ctx: OrgContext) {
    if (ctx.org.id !== orgId) {
      throw new ForbiddenException('Organization does not match active context');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async updateOrganizationSettings(
    ctx: OrgContext,
    dto: UpdateOrganizationSettingsDto,
    user: AuthenticatedUser,
  ) {
    if (!this.authorization.canManageOrgSettings(ctx, user)) {
      throw new ForbiddenException('You cannot update organization settings');
    }

    const orgId = ctx.org.id;
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
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.serviceArea !== undefined) updateData.serviceArea = dto.serviceArea;
    if (dto.addressLine1 !== undefined)
      updateData.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined)
      updateData.addressLine2 = dto.addressLine2;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.region !== undefined) updateData.region = dto.region;
    if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode;
    if (dto.countryCode !== undefined) updateData.countryCode = dto.countryCode;
    if (dto.lat !== undefined) updateData.lat = dto.lat;
    if (dto.lng !== undefined) updateData.lng = dto.lng;

    // For personal organizations, lock the name to "<User Name>'s Workspace"
    if (org.type === OrgType.PERSONAL) {
      const ownerMembership = await this.prisma.organizationMember.findFirst({
        where: { orgId, role: OrgRole.OWNER },
        include: { user: true },
      });
      const ownerName = ownerMembership?.user?.name || 'User';
      updateData.name = `${ownerName}'s Workspace`;
    } else if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    return updated;
  }

  async listOrganizationMembers(ctx: OrgContext) {
    if (ctx.effectiveRole === 'NONE') {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const orgId = ctx.org.id;
    const members = await this.prisma.organizationMember.findMany({
      where: { orgId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Filter by org membership role (TECHNICIAN or EDITOR) instead of accountType
    const fieldWorkerRoles: OrgRole[] = [OrgRole.TECHNICIAN, OrgRole.EDITOR];
    const fieldWorkerIds = members
      .filter((m) => fieldWorkerRoles.includes(m.role))
      .map((m) => m.userId);

    // Ensure each field worker has a personal org
    for (const workerId of fieldWorkerIds) {
      const personalMembership = await this.prisma.organizationMember.findFirst({
        where: {
          userId: workerId,
          organization: { type: OrgType.PERSONAL },
        },
      });

      if (!personalMembership) {
        const workerUser = await this.prisma.user.findUnique({
          where: { id: workerId },
        });
        const personalOrg = await this.prisma.organization.create({
          data: {
            id: randomUUID(),
            name: `${workerUser?.name || 'User'}'s Workspace`,
            type: OrgType.PERSONAL,
          },
        });
        await this.prisma.organizationMember.create({
          data: {
            userId: workerId,
            orgId: personalOrg.id,
            role: OrgRole.OWNER,
          },
        });
      }
    }

    const personalOrgs = fieldWorkerIds.length
      ? await this.prisma.organization.findMany({
          where: {
            type: OrgType.PERSONAL,
            members: { some: { userId: { in: fieldWorkerIds } } },
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

  async updateMemberRole(
    ctx: OrgContext,
    memberId: string,
    role: OrgRole,
    actingUser: AuthenticatedUser,
  ) {
    const orgId = ctx.org.id;
    const actingMembership = ctx.membership;

    if (
      !actingMembership ||
      !this.authorization.canManageTeamMembers(ctx, actingUser)
    ) {
      throw new ForbiddenException('You cannot update member roles in this org');
    }

    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, orgId },
    });
    if (!member) {
      throw new NotFoundException('Member not found in organization');
    }

    // Admins cannot change an OWNER's role
    if (member.role === OrgRole.OWNER && actingMembership.role !== OrgRole.OWNER) {
      throw new ForbiddenException('Only the current owner can change owner role');
    }

    // Only an OWNER can promote someone to OWNER
    if (role === OrgRole.OWNER && actingMembership.role !== OrgRole.OWNER) {
      throw new ForbiddenException('Only an owner can promote another owner');
    }

    const updates: Prisma.PrismaPromise<any>[] = [];

    // If promoting someone else to OWNER, demote acting OWNER to ADMIN
    if (
      role === OrgRole.OWNER &&
      actingMembership.role === OrgRole.OWNER &&
      actingMembership.id !== memberId
    ) {
      updates.push(
        this.prisma.organizationMember.update({
          where: { id: actingMembership.id },
          data: { role: OrgRole.ADMIN },
        }),
      );
    }

    updates.push(
      this.prisma.organizationMember.update({
        where: { id: memberId },
        data: { role },
        include: { user: true, organization: true },
      }),
    );

    const results = await this.prisma.$transaction(updates);
    const updatedMember = results[results.length - 1];
    return updatedMember;
  }
}
