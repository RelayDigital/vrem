import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const CurrentOrg = createParamDecorator(
  (_, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
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
