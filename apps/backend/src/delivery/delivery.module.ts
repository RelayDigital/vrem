import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryCustomerGuard } from './delivery-customer.guard';
import { DeliveryCommentGuard } from './delivery-comment.guard';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [DeliveryController],
  providers: [DeliveryService, DeliveryCustomerGuard, DeliveryCommentGuard],
  exports: [DeliveryService],
})
export class DeliveryModule {}
