import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IcsFeedService } from './ics-feed.service';
import { IcsFeedController } from './ics-feed.controller';

@Module({
  imports: [PrismaModule],
  controllers: [IcsFeedController],
  providers: [IcsFeedService],
  exports: [IcsFeedService],
})
export class CalendarIntegrationsModule {}
