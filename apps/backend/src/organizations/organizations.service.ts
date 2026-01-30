import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import {
  OrgRole,
  OrgType,
  Prisma,
  InvitationType,
  InvitationStatus,
  NotificationType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { EmailService } from '../email/email.service';
import {
  geocodeAddressComponents as geocodeUtil,
} from '../common/geocode.util';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private prisma: PrismaService,
    private authorization: AuthorizationService,
    private emailService: EmailService,
  ) {}

  /**
   * Helper to geocode address components.
   * Returns null if geocoding fails or MAPBOX_ACCESS_TOKEN is not set.
   */
  private async geocodeAddressComponents(address: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
    countryCode?: string | null;
  }): Promise<{ lat: number; lng: number } | null> {
    return geocodeUtil({
      addressLine1: address.addressLine1 ?? undefined,
      addressLine2: address.addressLine2 ?? undefined,
      city: address.city ?? undefined,
      region: address.region ?? undefined,
      postalCode: address.postalCode ?? undefined,
      countryCode: address.countryCode ?? undefined,
    });
  }

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
    // Get memberships where user is a team member
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });

    // Also get organizations where user is a customer (for AGENT accounts)
    const customerRelations = await this.prisma.organizationCustomer.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });

    // Convert customer relations to membership-like objects for frontend compatibility
    const customerMemberships = customerRelations.map((cust) => ({
      id: `customer-${cust.id}`,
      userId: cust.userId,
      orgId: cust.orgId,
      role: 'CUSTOMER' as const, // Virtual role for customers
      orgRole: 'CUSTOMER' as const,
      createdAt: cust.createdAt,
      organization: cust.organization,
      isCustomer: true,
    }));

    // Combine and return, prioritizing memberships over customer relationships
    const memberOrgIds = new Set(memberships.map((m) => m.orgId));
    const uniqueCustomerMemberships = customerMemberships.filter(
      (cm) => !memberOrgIds.has(cm.orgId),
    );

    return [...memberships, ...uniqueCustomerMemberships];
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
    const inviteType = dto.inviteType || InvitationType.MEMBER;
    
    // For CUSTOMER invites, role is not required
    // For MEMBER invites, default to AGENT if not specified
    const role = inviteType === InvitationType.CUSTOMER
      ? (dto.role || OrgRole.AGENT)
      : (dto.role || OrgRole.AGENT);

    const invitation = await this.prisma.invitation.create({
      data: {
        orgId: ctx.org.id,
        email: dto.email,
        role,
        inviteType,
        status: InvitationStatus.PENDING,
        token,
      },
    });

    // Check if the invited user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      // Create in-app notification for existing users
      const notificationType =
        inviteType === InvitationType.CUSTOMER
          ? NotificationType.INVITATION_CUSTOMER
          : NotificationType.INVITATION_MEMBER;

      await this.prisma.notification.create({
        data: {
          userId: existingUser.id,
          orgId: ctx.org.id,
          type: notificationType,
          invitationId: invitation.id,
        },
      });
    }

    // Send invitation email (for both existing and new users)
    // Fire-and-forget: don't await, don't fail the request
    this.emailService.sendInvitationEmail(
      dto.email,
      inviter.name,
      ctx.org.name,
      token,
      !!existingUser,
      inviteType,
      role,
    ).then((sent) => {
      if (sent) {
        this.logger.log(`Invitation email sent to ${dto.email} for org ${ctx.org.id}`);
      } else {
        this.logger.warn(`Invitation email failed to send to ${dto.email}`);
      }
    }).catch((emailError) => {
      this.logger.error(`Failed to send invitation email to ${dto.email}:`, emailError);
    });

    return invitation;
  }

  async acceptInvite(userId: string, dto: AcceptInviteDto) {
    const invite = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invite.accepted || invite.status === InvitationStatus.ACCEPTED) {
      return invite;
    }

    // Get the user for customer invites
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (invite.inviteType === InvitationType.CUSTOMER) {
      // Handle customer invite
      const existingCustomer = await this.prisma.organizationCustomer.findFirst({
        where: { userId, orgId: invite.orgId },
      });

      if (!existingCustomer) {
        await this.prisma.organizationCustomer.create({
          data: {
            userId,
            orgId: invite.orgId,
            name: user?.name || invite.email,
            email: user?.email || invite.email,
          },
        });
      }
    } else {
      // Handle member invite
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
    }

    await this.prisma.invitation.update({
      where: { id: invite.id },
      data: {
        accepted: true,
        status: InvitationStatus.ACCEPTED,
      },
    });

    return invite;
  }

  async getOrganizationById(
    orgId: string,
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    // If the requested org matches the active context, use the context's org
    if (ctx.org.id === orgId) {
      return ctx.org;
    }

    // Otherwise, check if the user is a member of the requested org
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id, orgId },
      include: { organization: true },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You are not a member of this organization',
      );
    }

    return membership.organization;
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
    if (dto.paymentMode !== undefined) updateData.paymentMode = dto.paymentMode;

    // Auto-geocode if address changed but lat/lng not explicitly provided
    const addressFieldsChanged =
      dto.addressLine1 !== undefined ||
      dto.city !== undefined ||
      dto.region !== undefined ||
      dto.postalCode !== undefined ||
      dto.countryCode !== undefined;

    if (addressFieldsChanged && dto.lat === undefined && dto.lng === undefined) {
      // Build address from updated fields (or fall back to existing org values)
      const addressForGeocode = {
        addressLine1: dto.addressLine1 ?? org.addressLine1,
        addressLine2: dto.addressLine2 ?? org.addressLine2,
        city: dto.city ?? org.city,
        region: dto.region ?? org.region,
        postalCode: dto.postalCode ?? org.postalCode,
        countryCode: dto.countryCode ?? org.countryCode,
      };

      const coords = await this.geocodeAddressComponents(addressForGeocode);
      if (coords) {
        updateData.lat = coords.lat;
        updateData.lng = coords.lng;
        this.logger.log(`Auto-geocoded address for org ${orgId}: ${coords.lat}, ${coords.lng}`);
      }
    }

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

  /**
   * Validate an invite code and return organization info.
   * This is a public endpoint for the onboarding flow.
   */
  async validateInviteCode(token: string): Promise<{
    valid: boolean;
    organization?: {
      id: string;
      name: string;
      logoUrl?: string;
      type: OrgType;
    };
    role?: OrgRole;
    inviteType?: InvitationType;
  }> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      return { valid: false };
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      return { valid: false };
    }

    return {
      valid: true,
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        logoUrl: invitation.organization.logoUrl || undefined,
        type: invitation.organization.type,
      },
      role: invitation.role,
      inviteType: invitation.inviteType,
    };
  }

  /**
   * Get pending invitations for an email address.
   * Used during onboarding to detect if a user was invited before signing up.
   */
  async getPendingInvitationsByEmail(email: string): Promise<{
    invitations: Array<{
      id: string;
      token: string;
      organization: {
        id: string;
        name: string;
        logoUrl?: string;
        type: OrgType;
      };
      role: OrgRole;
      inviteType: InvitationType;
      createdAt: Date;
    }>;
  }> {
    const normalizedEmail = email.toLowerCase().trim();

    const invitations = await this.prisma.invitation.findMany({
      where: {
        email: normalizedEmail,
        status: InvitationStatus.PENDING,
      },
      include: {
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      invitations: invitations.map((inv) => ({
        id: inv.id,
        token: inv.token,
        organization: {
          id: inv.organization.id,
          name: inv.organization.name,
          logoUrl: inv.organization.logoUrl || undefined,
          type: inv.organization.type,
        },
        role: inv.role,
        inviteType: inv.inviteType,
        createdAt: inv.createdAt,
      })),
    };
  }
}
