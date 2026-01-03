import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import type { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { OrderFulfillmentService } from '../stripe/order-fulfillment.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, OrgContextGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderFulfillment: OrderFulfillmentService,
  ) {}

  /**
   * Creates a new order (Project + Customer + CalendarEvent)
   * POST /orders/create
   */
  @Post('create')
  async createOrder(
    @Req() req: any,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.ordersService.createOrder(ctx, user, dto);
  }

  /**
   * Creates a Stripe Checkout session for an agent order.
   * POST /orders/checkout
   */
  @Post('checkout')
  async createCheckout(
    @Req() req: any,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.ordersService.createCheckoutSession(ctx, user, dto);
  }

  /**
   * Gets the status of a pending order by Stripe session ID.
   * GET /orders/status/:sessionId
   */
  @Get('status/:sessionId')
  async getOrderStatus(@Param('sessionId') sessionId: string) {
    return this.orderFulfillment.getOrderStatus(sessionId);
  }

  /**
   * Lists all orders for the organization
   * GET /orders
   */
  @Get()
  async listOrders(
    @Req() req: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.ordersService.listOrders(ctx, user);
  }

  /**
   * Cancel an order as the customer (agent).
   * Only allows cancellation if the user is the customer of the project.
   * DELETE /orders/:projectId/cancel
   *
   * Note: Uses only JwtAuthGuard (not OrgContextGuard) since agents aren't org members.
   */
  @Delete(':projectId/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.cancelOrderAsCustomer(projectId, user);
  }
}

