import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardingController } from '../onboarding/onboarding.controller';

@Module({
  controllers: [UsersController, OnboardingController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
