import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OnboardingService } from './onboarding.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private onboarding: OnboardingService) {}

  @Get('onboarding')
  async getOnboarding(@CurrentUser() user) {
    return this.onboarding.determineOnboarding(user.id);
  }
}
