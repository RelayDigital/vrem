import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRole, OrgType, UserAccountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthenticatedUser, OrgContext, buildOrgContext } from './auth-context';
import { randomUUID } from 'crypto';

@Injectable()
export class OrgContextGuard implements CanActivate {
  private readonly logger = new Logger(OrgContextGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Check if an AGENT user has customer access to a project in the given org.
   * This allows agents to access project resources (messages, media) for projects
   * where they are the linked customer, even if they're not a member of the org.
   */
  private async checkCustomerAccess(
    req: any,
    user: AuthenticatedUser,
    orgId: string,
  ): Promise<boolean> {
    // Only agents can have customer access
    if (user.accountType !== UserAccountType.AGENT) {
      return false;
    }

    // Extract project ID from URL path
    // Matches patterns like:
    // - /projects/:projectId/... or /projects/:projectId
    // - /media/project/:projectId
    const url = req.url || req.path || '';
    let projectId: string | null = null;
    
    // Try /projects/:projectId pattern
    const projectsMatch = url.match(/\/projects\/([a-f0-9-]+)/i);
    if (projectsMatch) {
      projectId = projectsMatch[1];
    }
    
    // Try /media/project/:projectId pattern
    if (!projectId) {
      const mediaMatch = url.match(/\/media\/project\/([a-f0-9-]+)/i);
      if (mediaMatch) {
        projectId = mediaMatch[1];
      }
    }
    
    if (!projectId) {
      return false;
    }

    // Check if the project belongs to this org AND the user is the linked customer
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        orgId: orgId,
        customer: { userId: user.id },
      },
      select: { id: true },
    });

    return !!project;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthenticatedUser | undefined;

    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    // User-scoped endpoints under /me/* and /auth/* don't require org membership validation
    // These endpoints operate on the authenticated user's data, not org-scoped data
    const url = req.url || req.path || '';
    if (url.startsWith('/me/') || url === '/me' || url.startsWith('/auth/')) {
      return true;
    }

    if (req.orgContext) {
      return true;
    }

    const headerOrgId = req.headers['x-org-id'];
    let orgId =
      (Array.isArray(headerOrgId) ? headerOrgId[0] : headerOrgId) ||
      user.personalOrgId ||
      null;

    let org: OrgContext['org'] | null = null;
    let membership: OrgContext['membership'] = null;

    if (!orgId) {
      let personalMembership = await this.prisma.organizationMember.findFirst({
        where: {
          userId: user.id,
          organization: { type: OrgType.PERSONAL },
        },
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
      });

      // Auto-provision personal org if missing (defensive recovery)
      if (!personalMembership) {
        this.logger.warn(`Personal org missing for user ${user.id}, auto-provisioning...`);
        try {
          // Fetch user to get name for org creation
          const dbUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { name: true },
          });
          const userName = dbUser?.name || 'Personal';

          // Create personal org in transaction
          const result = await this.prisma.$transaction(async (tx) => {
            const personalOrg = await tx.organization.create({
              data: {
                id: randomUUID(),
                name: `${userName} Workspace`,
                type: OrgType.PERSONAL,
              },
            });

            const newMembership = await tx.organizationMember.create({
              data: {
                userId: user.id,
                orgId: personalOrg.id,
                role: OrgRole.OWNER,
              },
              include: { organization: true },
            });

            return newMembership;
          });

          personalMembership = result;
          this.logger.log(`Auto-provisioned personal org ${result.orgId} for user ${user.id}`);
        } catch (provisionError: any) {
          // Race condition - another request created it, retry lookup
          if (provisionError.code === 'P2002') {
            personalMembership = await this.prisma.organizationMember.findFirst({
              where: {
                userId: user.id,
                organization: { type: OrgType.PERSONAL },
              },
              include: { organization: true },
              orderBy: { createdAt: 'asc' },
            });
          }
          if (!personalMembership) {
            this.logger.error(`Failed to provision personal org for user ${user.id}:`, provisionError);
            throw new ForbiddenException('Personal organization not found');
          }
        }
      }

      orgId = personalMembership.orgId;
      org = personalMembership.organization;
      membership = personalMembership;
    } else {
      org = await this.prisma.organization.findUnique({
        where: { id: String(orgId) },
      });

      if (!org) {
        throw new NotFoundException('Organization not found');
      }

      membership = await this.prisma.organizationMember.findFirst({
        where: { userId: user.id, orgId: org.id },
      });

      const isPersonalOrg = String(org.type) === 'PERSONAL';
      if (isPersonalOrg && !membership) {
        const ownerMembership = await this.prisma.organizationMember.findFirst({
          where: { orgId: org.id, role: OrgRole.OWNER },
        });
        if (ownerMembership?.userId === user.id) {
          membership = ownerMembership;
        }
      }
    }

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const memberCount = await this.prisma.organizationMember.count({
      where: { orgId: org.id },
    });

    const isPersonalOrg = String(org.type) === 'PERSONAL';
    if (isPersonalOrg) {
      if (!membership || membership.userId !== user.id) {
        throw new ForbiddenException(
          'You do not have access to this personal organization',
        );
      }
      req.user = { ...user, personalOrgId: org.id };
    } else if (!membership) {
      // Check if user is an AGENT accessing a project they're linked to as a customer
      // This allows cross-org access for customer-assigned projects
      const isCustomerAccess = await this.checkCustomerAccess(req, user, org.id);
      if (!isCustomerAccess) {
        throw new ForbiddenException('You do not belong to this organization');
      }
      // For customer access, we create a minimal context - the service layer will handle authorization
      this.logger.debug(`Agent ${user.id} granted customer access to org ${org.id}`);
    }

    const orgContext = buildOrgContext({
      user: req.user,
      org,
      membership,
      memberCount,
    });

    req.orgContext = orgContext;
    req.activeOrg = org;
    req.activeOrgId = org.id;
    req.activeOrgMembership = membership;

    return true;
  }
}
