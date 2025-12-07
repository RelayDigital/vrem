import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { OnboardingController } from '../onboarding/onboarding.controller';
import { OnboardingService } from '../onboarding/onboarding.service';

@Module({
  controllers: [UsersController, OnboardingController],
  providers: [UsersService, OnboardingService],
  exports: [UsersService],
})
export class UsersModule {}
