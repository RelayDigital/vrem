import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class OrgMemberGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    if (!req.activeOrgId) {
      throw new ForbiddenException('Organization context required');
    }

    if (!req.activeOrgMembership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return true;
  }
}
