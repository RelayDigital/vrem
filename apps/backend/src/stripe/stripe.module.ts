import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './stripe.controller';
import { OrderFulfillmentService } from './order-fulfillment.service';

@Module({
  controllers: [StripeWebhookController],
  providers: [StripeService, OrderFulfillmentService],
  exports: [StripeService, OrderFulfillmentService],
})
export class StripeModule {}
