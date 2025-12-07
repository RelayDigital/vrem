import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OrgContext } from '../auth/auth-context';

export const CurrentOrg = createParamDecorator(
  (_, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const orgContext = request.orgContext as OrgContext | undefined;

    if (orgContext) {
      return {
        id: orgContext.org.id,
        org: orgContext.org,
        membership: orgContext.membership,
        orgContext,
      };
    }

    const orgId = request.activeOrgId;
    const org = request.activeOrg;
    const membership = request.activeOrgMembership;

    // Return an object that can be accessed as org.id or just return the org directly
    // For backward compatibility, return an object with id property
    return {
      id: orgId || org?.id || null,
      org: org || null,
      membership: membership || null,
    };
  },
);
