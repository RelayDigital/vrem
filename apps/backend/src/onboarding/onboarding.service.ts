import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgRole, OrgType } from '@prisma/client';

export interface CustomerOrganization {
  orgId: string;
  orgName: string;
  orgType: OrgType;
  logoUrl?: string;
  city?: string;
  region?: string;
  countryCode?: string;
  primaryEmail?: string;
  websiteUrl?: string;
  customerId: string;
  createdAt: Date;
}

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async determineOnboarding(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      return { step: 'error', message: 'User not found' };
    }

    const memberships = user.organizations;

    // Separate personal org from team/company orgs
    const personalOrgMembership = memberships.find(
      (m) => m.organization.type === OrgType.PERSONAL,
    );
    const teamOrCompanyMemberships = memberships.filter(
      (m) => m.organization.type !== OrgType.PERSONAL,
    );

    // Check if user is an OWNER or ADMIN in any non-personal org (manager capability)
    const hasManagerRole = teamOrCompanyMemberships.some(
      (m) => m.role === OrgRole.OWNER || m.role === OrgRole.ADMIN,
    );

    // Any authenticated user can create organizations (TEAM or COMPANY)
    const canCreateOrganization = true;

    //
    // MANAGER FLOW (user is OWNER/ADMIN in at least one team/company org)
    //
    if (hasManagerRole) {
      if (teamOrCompanyMemberships.length === 1) {
        return {
          step: 'dashboard',
          orgId: teamOrCompanyMemberships[0].orgId,
        };
      }

      // Multiple team/company orgs → choose workspace
      return {
        step: 'choose-organization',
        organizations: teamOrCompanyMemberships.map((m) => ({
          orgId: m.orgId,
          name: m.organization.name,
          role: m.role,
          type: m.organization.type,
        })),
      };
    }

    //
    // MEMBER FLOW (TECHNICIAN, EDITOR, PROJECT_MANAGER in team/company orgs)
    //
    if (teamOrCompanyMemberships.length > 0) {
      if (teamOrCompanyMemberships.length === 1) {
        return {
          step: 'dashboard',
          orgId: teamOrCompanyMemberships[0].orgId,
        };
      }

      // Multiple orgs → choose one
      return {
        step: 'choose-organization',
        organizations: teamOrCompanyMemberships.map((m) => ({
          orgId: m.orgId,
          name: m.organization.name,
          role: m.role,
          type: m.organization.type,
        })),
      };
    }

    //
    // PERSONAL-ONLY FLOW (user only has personal org)
    //
    if (personalOrgMembership) {
      return {
        step: 'dashboard',
        orgId: personalOrgMembership.orgId,
        isPersonalOnly: true,
        canCreateOrganization,
        canJoinOrganization: true,
        showCreateOrgCTA: true,
        showJoinOrgCTA: true,
        message: 'You are in your personal workspace. Create or join an organization to collaborate.',
      };
    }

    // Edge case: no organizations at all (should not happen as personal org is created on registration)
    return {
      step: 'no-organizations-yet',
      canCreateOrganization,
      canJoinOrganization: true,
      showCreateOrgCTA: true,
      showJoinOrgCTA: true,
      message: 'You are not part of any organization yet.',
    };
  }

  /**
   * Get all COMPANY organizations where the user is registered as a customer.
   * Used by agents to select which provider org should fulfill their order.
   */
  async getCustomerOrganizations(userId: string): Promise<CustomerOrganization[]> {
    const customerRelations = await this.prisma.organizationCustomer.findMany({
      where: {
        userId: userId,
        organization: {
          type: OrgType.COMPANY,
        },
      },
      include: {
        organization: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return customerRelations.map((relation) => ({
      orgId: relation.organization.id,
      orgName: relation.organization.name,
      orgType: relation.organization.type,
      logoUrl: relation.organization.logoUrl || undefined,
      city: relation.organization.city || undefined,
      region: relation.organization.region || undefined,
      countryCode: relation.organization.countryCode || undefined,
      primaryEmail: relation.organization.primaryEmail || undefined,
      websiteUrl: relation.organization.websiteUrl || undefined,
      customerId: relation.id,
      createdAt: relation.createdAt,
    }));
  }
}
