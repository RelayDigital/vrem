import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserAccountType } from '@prisma/client';

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

    const globalRole = user.accountType;
    const memberships = user.organizations;
    const membershipCount = memberships.length;

    //
    // GLOBAL ADMIN FLOW
    //
    if (globalRole === UserAccountType.COMPANY) {
      if (membershipCount === 0) {
        return {
          step: 'create-organization',
          message: 'You must create your media company',
        };
      }

      if (membershipCount === 1) {
        return {
          step: 'dashboard',
          orgId: memberships[0].orgId,
        };
      }

      // Admin in multiple orgs → choose workspace
      return {
        step: 'choose-organization',
        organizations: memberships.map((m) => ({
          orgId: m.orgId,
          name: m.organization.name,
          role: m.role,
        })),
      };
    }

    //
    // PROJECT MANAGER + TECHNICIAN + EDITOR + AGENT FLOW
    //

    // No organizations yet, but user can still continue
    if (membershipCount === 0) {
      return {
        step: 'no-organizations-yet',
        canCreateOrganization: user.accountType === UserAccountType.COMPANY,
        canJoinOrganization: true,
        showCreateOrgCTA: user.accountType === UserAccountType.COMPANY,
        showJoinOrgCTA: true,
        message: 'You are not part of any organization yet.',
      };
    }

    // Exactly one organization → go straight to dashboard
    if (membershipCount === 1) {
      return {
        step: 'dashboard',
        orgId: memberships[0].orgId,
      };
    }

    // Multiple orgs → choose one
    return {
      step: 'choose-organization',
      organizations: memberships.map((m) => ({
        orgId: m.orgId,
        name: m.organization.name,
        role: m.role,
      })),
    };
  }
}
