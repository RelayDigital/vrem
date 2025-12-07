import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OnboardingService } from './onboarding.service';
import type { AuthenticatedUser } from '../auth/auth-context';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private onboarding: OnboardingService) {}

  @Get('onboarding')
  async getOnboarding(@CurrentUser() user: AuthenticatedUser) {
    return this.onboarding.determineOnboarding(user.id);
  }

  /**
   * GET /me/customer-organizations
   * Returns all COMPANY organizations where the current user is a customer.
   * Used by agents to select which provider org should fulfill their order.
   */
  @Get('customer-organizations')
  async getCustomerOrganizations(@CurrentUser() user: AuthenticatedUser) {
    return this.onboarding.getCustomerOrganizations(user.id);
  }
}
