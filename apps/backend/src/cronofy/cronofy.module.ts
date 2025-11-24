import { Module } from '@nestjs/common';
import { CronofyService } from './cronofy.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [CronofyService, PrismaService],
  exports: [CronofyService],
})
export class CronofyModule {}
