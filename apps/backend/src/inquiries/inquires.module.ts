import { Module } from '@nestjs/common';
import { InquiriesService } from './inquires.service';
import { InquiriesController } from './inquires.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [InquiriesService],
  controllers: [InquiriesController],
})
export class InquiriesModule {}
