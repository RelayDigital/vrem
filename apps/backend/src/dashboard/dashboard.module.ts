import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, MetricsService],
  exports: [MetricsService],
})
export class DashboardModule {}
