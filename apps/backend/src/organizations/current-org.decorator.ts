import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentOrg = createParamDecorator(
  (_, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return {
      id: request.activeOrgId || null,
      org: request.activeOrg || null,
      membership: request.activeOrgMembership || null,
    };
  },
);
