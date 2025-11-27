import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActiveOrgMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: any, res: any, next: () => void) {
    // pull orgId from header or query
    const orgId = req.headers['x-org-id'] || req.query.orgId;

    req.activeOrgId = null;
    req.activeOrg = null;

    // If no orgId provided → user is operating without an org
    if (!orgId) return next();

    // Validate organization exists
    const org = await this.prisma.organization.findUnique({
      where: { id: String(orgId) },
    });

    if (!org) {
      throw new ForbiddenException('Organization not found');
    }

    // If user is logged in, ensure they belong to this org
    if (req.user) {
      const membership = await this.prisma.organizationMember.findFirst({
        where: {
          userId: req.user.id,
          orgId: String(orgId),
        },
      });

      if (!membership) {
        throw new ForbiddenException(
          'You are not a member of this organization'
        );
      }

      req.activeOrgMembership = membership;
    }

    req.activeOrgId = orgId;
    req.activeOrg = org;

    next();
  }
}
