import { Module } from '@nestjs/common';
import { NylasService } from './nylas.service';
import { NylasController } from './nylas.controller';
import { CalendarSyncService } from './calendar-sync.service';

@Module({
  controllers: [NylasController],
  providers: [NylasService, CalendarSyncService],
  exports: [NylasService, CalendarSyncService],
})
export class NylasModule {}
