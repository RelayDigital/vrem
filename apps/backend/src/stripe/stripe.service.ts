import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not set - Stripe operations will fail');
    }
    this.stripe = new Stripe(secretKey || '', {
      apiVersion: '2025-11-17.clover',
    });
  }

  /**
   * Create a Stripe Checkout Session for an order.
   */
  async createCheckoutSession(params: {
    pendingOrderId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    description: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: params.customerEmail,
      line_items: [
        {
          price_data: {
            currency: params.currency,
            product_data: {
              name: 'Photography Services',
              description: params.description,
            },
            unit_amount: params.amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        pendingOrderId: params.pendingOrderId,
        ...params.metadata,
      },
    });

    return session;
  }

  /**
   * Retrieve a Checkout Session by ID.
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }

  /**
   * Construct and verify a webhook event from Stripe.
   */
  constructWebhookEvent(
    payload: Buffer,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
