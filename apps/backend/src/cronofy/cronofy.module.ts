import { Module } from '@nestjs/common';
import { CronofyService } from './cronofy.service';

@Module({
  providers: [CronofyService],
  exports: [CronofyService],
})
export class CronofyModule {}
