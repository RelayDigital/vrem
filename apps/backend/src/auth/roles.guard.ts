import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role, OrgRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No role restriction on this route
    }

    const req = context.switchToHttp().getRequest();
    const { user } = req;
    if (!user) return false;

    // Allow via org membership: ADMIN/OWNER treated as DISPATCHER for org-scoped routes
    if (requiredRoles.includes(Role.DISPATCHER)) {
      const membership = req.membership || req.activeOrgMembership || null;
      if (
        membership &&
        (membership.role === OrgRole.ADMIN || membership.role === OrgRole.OWNER)
      ) {
        return true;
      }
      const activeOrgId =
        req.activeOrgId || req.params?.orgId || req.headers?.['x-org-id'];
      if (activeOrgId) {
        const dbMembership = await this.prisma.organizationMember.findFirst({
          where: { userId: user.id, orgId: String(activeOrgId) },
        });
        if (
          dbMembership &&
          (dbMembership.role === OrgRole.ADMIN ||
            dbMembership.role === OrgRole.OWNER)
        ) {
          req.membership = dbMembership;
          return true;
        }
      }
    }

    return requiredRoles.includes(user.role);
  }
}
