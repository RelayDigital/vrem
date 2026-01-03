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
      const personalMembership = await this.prisma.organizationMember.findFirst({
        where: {
          userId: user.id,
          organization: { type: OrgType.PERSONAL },
        },
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!personalMembership) {
        throw new ForbiddenException('Personal organization not found');
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
