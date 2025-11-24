import { Module } from '@nestjs/common';
import { InquiriesService } from './inquires.service';
import { InquiriesController } from './inquires.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [InquiriesService, PrismaService],
  controllers: [InquiriesController],
})
export class InquiriesModule {}
