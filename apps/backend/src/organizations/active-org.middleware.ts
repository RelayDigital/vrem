import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActiveOrgMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ActiveOrgMiddleware.name);

  constructor(private prisma: PrismaService) {}

  async use(req: any, res: any, next: () => void) {
    try {
    // pull orgId from header or query
    const orgId = req.headers['x-org-id'] || req.query.orgId;

    req.activeOrgId = null;
    req.activeOrg = null;
      req.activeOrgMembership = null;

    // If no orgId provided → user is operating without an org
      if (!orgId) {
        this.logger.debug('No orgId provided in request');
        return next();
      }

      this.logger.log(`Processing orgId: ${orgId}`);

    // Validate organization exists
    const org = await this.prisma.organization.findUnique({
      where: { id: String(orgId) },
    });

    if (!org) {
        this.logger.warn(`Organization not found: ${orgId}`);
      throw new ForbiddenException('Organization not found');
    }

      // Set org context - membership will be validated by OrgMemberGuard after JwtAuthGuard sets req.user
    req.activeOrgId = orgId;
    req.activeOrg = org;
      
      // Note: req.user is not available yet (middleware runs before guards)
      // OrgMemberGuard will check membership after JwtAuthGuard sets req.user

    next();
    } catch (error: any) {
      this.logger.error(`Error in ActiveOrgMiddleware: ${error.message}`, error.stack);
      // Re-throw ForbiddenException, but wrap other errors
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException(`Failed to validate organization: ${error.message}`);
    }
  }
}
