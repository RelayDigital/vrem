import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import type { AuthenticatedUser, OrgContext } from '../auth/auth-context';

@Controller('orders')
@UseGuards(JwtAuthGuard, OrgContextGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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
}

