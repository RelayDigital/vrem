import { Module } from '@nestjs/common';
import { CronofyController } from './cronofy.controller';
import { CronofyService } from './cronofy.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CronofyController],
  providers: [CronofyService],
  exports: [CronofyService],
})
export class CronofyModule {}
