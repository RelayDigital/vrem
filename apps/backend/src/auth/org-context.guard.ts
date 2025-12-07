import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRole, OrgType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthenticatedUser, OrgContext, buildOrgContext } from './auth-context';

@Injectable()
export class OrgContextGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

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
      throw new ForbiddenException('You do not belong to this organization');
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
