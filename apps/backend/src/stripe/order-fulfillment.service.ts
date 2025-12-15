import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PendingOrderStatus, ProjectStatus } from '@prisma/client';
import { StripeService } from './stripe.service';

interface PaymentDetails {
  stripeSessionId: string;
  stripePaymentIntentId: string;
  amountPaid: number;
  currency: string;
}

@Injectable()
export class OrderFulfillmentService {
  private readonly logger = new Logger(OrderFulfillmentService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  /**
   * Fulfill a pending order by creating the project after successful payment.
   */
  async fulfillOrder(pendingOrderId: string, payment: PaymentDetails): Promise<void> {
    const pendingOrder = await this.prisma.pendingOrder.findUnique({
      where: { id: pendingOrderId },
    });

    if (!pendingOrder) {
      throw new NotFoundException(`PendingOrder ${pendingOrderId} not found`);
    }

    if (pendingOrder.status !== PendingOrderStatus.PENDING_PAYMENT) {
      this.logger.warn(`Order ${pendingOrderId} already processed: ${pendingOrder.status}`);
      return;
    }

    // Parse the order data
    const orderData = pendingOrder.orderData as {
      addressLine1: string;
      addressLine2?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      countryCode?: string;
      lat?: number;
      lng?: number;
      scheduledTime: string;
      notes?: string;
      mediaTypes?: string[];
      priority?: string;
    };

    // Create the project
    const project = await this.prisma.project.create({
      data: {
        orgId: pendingOrder.providerOrgId,
        customerId: pendingOrder.agentCustomerId,
        addressLine1: orderData.addressLine1,
        addressLine2: orderData.addressLine2,
        city: orderData.city,
        region: orderData.region,
        postalCode: orderData.postalCode,
        countryCode: orderData.countryCode,
        lat: orderData.lat,
        lng: orderData.lng,
        notes: orderData.notes,
        scheduledTime: new Date(orderData.scheduledTime),
        status: ProjectStatus.BOOKED,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        paidAt: new Date(),
        paymentAmount: payment.amountPaid,
        paymentCurrency: payment.currency,
      },
    });

    // Update the pending order to completed
    await this.prisma.pendingOrder.update({
      where: { id: pendingOrderId },
      data: {
        status: PendingOrderStatus.PROJECT_CREATED,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        completedAt: new Date(),
        projectId: project.id,
      },
    });

    this.logger.log(`Created project ${project.id} for order ${pendingOrderId}`);
  }

  /**
   * Mark a pending order as expired.
   */
  async expireOrder(pendingOrderId: string): Promise<void> {
    const pendingOrder = await this.prisma.pendingOrder.findUnique({
      where: { id: pendingOrderId },
    });

    if (!pendingOrder) {
      return;
    }

    if (pendingOrder.status !== PendingOrderStatus.PENDING_PAYMENT) {
      return;
    }

    await this.prisma.pendingOrder.update({
      where: { id: pendingOrderId },
      data: {
        status: PendingOrderStatus.EXPIRED,
      },
    });

    this.logger.log(`Expired order ${pendingOrderId}`);
  }

  /**
   * Get the status of a pending order.
   * If order is still pending, checks Stripe directly and auto-fulfills if paid.
   * This is a fallback for when webhooks are delayed or unavailable.
   */
  async getOrderStatus(sessionId: string) {
    let pendingOrder = await this.prisma.pendingOrder.findUnique({
      where: { stripeSessionId: sessionId },
      include: {
        project: true,
      },
    });

    if (!pendingOrder) {
      throw new NotFoundException('Order not found');
    }

    // If order is still pending, check Stripe directly (fallback for missed webhooks)
    if (pendingOrder.status === PendingOrderStatus.PENDING_PAYMENT) {
      try {
        const session = await this.stripeService.getCheckoutSession(sessionId);

        // If Stripe shows payment completed, fulfill the order now
        if (session.payment_status === 'paid') {
          this.logger.log(`Fallback fulfillment triggered for session ${sessionId}`);

          await this.fulfillOrder(pendingOrder.id, {
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string,
            amountPaid: session.amount_total || 0,
            currency: session.currency || 'usd',
          });

          // Re-fetch the updated order
          pendingOrder = await this.prisma.pendingOrder.findUnique({
            where: { stripeSessionId: sessionId },
            include: {
              project: true,
            },
          });

          if (!pendingOrder) {
            throw new NotFoundException('Order not found after fulfillment');
          }
        } else if (session.status === 'expired') {
          // Session expired, mark order as expired
          await this.expireOrder(pendingOrder.id);
          pendingOrder = await this.prisma.pendingOrder.findUnique({
            where: { stripeSessionId: sessionId },
            include: { project: true },
          });
          if (!pendingOrder) {
            throw new NotFoundException('Order not found');
          }
        }
      } catch (error: any) {
        // Log but don't fail - we'll just return current status
        this.logger.warn(`Failed to check Stripe session ${sessionId}: ${error.message}`);
      }
    }

    // TypeScript guard - pendingOrder should never be null at this point
    // since we throw NotFoundException if re-fetch fails
    const order = pendingOrder!;

    return {
      status: order.status,
      projectId: order.projectId,
      project: order.project
        ? {
            id: order.project.id,
            addressLine1: order.project.addressLine1,
            city: order.project.city,
            status: order.project.status,
          }
        : null,
    };
  }
}
