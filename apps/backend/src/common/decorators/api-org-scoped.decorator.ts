import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiSecurity,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

export function ApiOrgScoped() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiSecurity('x-org-id'),
    ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' }),
    ApiForbiddenResponse({ description: 'Not a member of the specified organization' }),
  );
}
