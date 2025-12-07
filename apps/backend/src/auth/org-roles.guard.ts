import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EffectiveOrgRole, OrgContext } from './auth-context';
import { ORG_ROLES_KEY } from './org-roles.decorator';

/**
 * Guard that checks if the user's effective role in the current org context
 * matches one of the roles specified by the @OrgRoles decorator.
 *
 * This guard requires OrgContextGuard to have run first to populate req.orgContext.
 *
 * @example
 * ```typescript
 * @OrgRoles('OWNER', 'ADMIN', 'PROJECT_MANAGER')
 * @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
 * @Get('admin-only')
 * adminOnly() { ... }
 * ```
 */
@Injectable()
export class OrgRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<EffectiveOrgRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const orgContext = request.orgContext as OrgContext | undefined;

    if (!orgContext) {
      throw new ForbiddenException(
        'Organization context not found. Ensure OrgContextGuard runs before OrgRolesGuard.',
      );
    }

    const { effectiveRole } = orgContext;

    if (effectiveRole === 'NONE') {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    const hasRole = requiredRoles.includes(effectiveRole);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}

