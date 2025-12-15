import { SetMetadata } from '@nestjs/common';
import { EffectiveOrgRole } from './auth-context';

export const ORG_ROLES_KEY = 'orgRoles';

/**
 * Decorator to specify which organization roles are allowed to access a route.
 * Used in conjunction with OrgRolesGuard.
 *
 * @example
 * ```typescript
 * @OrgRoles('OWNER', 'ADMIN')
 * @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
 * @Get('settings')
 * getSettings() { ... }
 * ```
 */
export const OrgRoles = (...roles: EffectiveOrgRole[]) =>
  SetMetadata(ORG_ROLES_KEY, roles);




