import {
  Controller,
  Post,
  Req,
  Headers,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { OrderFulfillmentService } from './order-fulfillment.service';
import { Public } from '../auth/public.decorator';

@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private stripeService: StripeService,
    private orderFulfillment: OrderFulfillmentService,
  ) {}

  // Webhook endpoints must be public (no auth) but protected by signature verification
  // Skip rate limiting since Stripe controls the request frequency
  @Public()
  @SkipThrottle()
  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET not configured');
      throw new BadRequestException('Webhook not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripeService.constructWebhookEvent(
        req.rawBody!,
        signature,
        webhookSecret,
      );
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Received Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutCompleted(session);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutExpired(session);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.warn(`Payment failed for intent: ${paymentIntent.id}`);
        break;
      }
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const pendingOrderId = session.metadata?.pendingOrderId;
    if (!pendingOrderId) {
      this.logger.error('No pendingOrderId in checkout session metadata');
      return;
    }

    this.logger.log(`Processing checkout completion for order: ${pendingOrderId}`);

    try {
      await this.orderFulfillment.fulfillOrder(pendingOrderId, {
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string,
        amountPaid: session.amount_total || 0,
        currency: session.currency || 'usd',
      });
      this.logger.log(`Order ${pendingOrderId} fulfilled successfully`);
    } catch (error: any) {
      this.logger.error(`Failed to fulfill order ${pendingOrderId}: ${error.message}`);
    }
  }

  private async handleCheckoutExpired(session: Stripe.Checkout.Session) {
    const pendingOrderId = session.metadata?.pendingOrderId;
    if (!pendingOrderId) {
      return;
    }

    this.logger.log(`Checkout expired for order: ${pendingOrderId}`);

    try {
      await this.orderFulfillment.expireOrder(pendingOrderId);
    } catch (error: any) {
      this.logger.error(`Failed to expire order ${pendingOrderId}: ${error.message}`);
    }
  }
}
