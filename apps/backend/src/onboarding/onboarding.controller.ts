import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OnboardingService } from './onboarding.service';
import type { AuthenticatedUser } from '../auth/auth-context';

@ApiTags('Onboarding')
@ApiBearerAuth('bearer')
@Controller('me')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private onboarding: OnboardingService) {}

  @ApiOperation({ summary: 'Get onboarding status for current user' })
  @Get('onboarding')
  async getOnboarding(@CurrentUser() user: AuthenticatedUser) {
    return this.onboarding.determineOnboarding(user.id);
  }

  @ApiOperation({ summary: 'Get customer organizations for agent ordering' })
  @Get('customer-organizations')
  async getCustomerOrganizations(@CurrentUser() user: AuthenticatedUser) {
    return this.onboarding.getCustomerOrganizations(user.id);
  }
}
