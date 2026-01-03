import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { ArtifactWorkerService } from './artifact-worker.service';
import { DeliveryCustomerGuard } from './delivery-customer.guard';
import { DeliveryCommentGuard } from './delivery-comment.guard';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [DeliveryController],
  providers: [
    DeliveryService,
    ArtifactWorkerService,
    DeliveryCustomerGuard,
    DeliveryCommentGuard,
  ],
  exports: [DeliveryService, ArtifactWorkerService],
})
export class DeliveryModule {}
