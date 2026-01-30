import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';
import { OrgRolesGuard } from '../auth/org-roles.guard';
import { OrgRoles } from '../auth/org-roles.decorator';
import { Public } from '../auth/public.decorator';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/create-invoice.dto';
import { ApiOrgScoped } from '../common/decorators/api-org-scoped.decorator';
import type { OrgContext } from '../auth/auth-context';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /**
   * List all invoices for the organization
   * GET /invoices
   */
  @ApiOrgScoped()
  @ApiOperation({ summary: 'List invoices for organization' })
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN', 'PROJECT_MANAGER')
  @Get()
  async listInvoices(@Req() req: any) {
    const ctx = req.orgContext as OrgContext;
    return this.invoicesService.listInvoices(ctx);
  }

  /**
   * Get a single invoice
   * GET /invoices/:id
   */
  @ApiOrgScoped()
  @ApiOperation({ summary: 'Get invoice by ID' })
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN', 'PROJECT_MANAGER')
  @Get(':id')
  async getInvoice(@Req() req: any, @Param('id') id: string) {
    const ctx = req.orgContext as OrgContext;
    return this.invoicesService.getInvoice(ctx, id);
  }

  /**
   * Get invoice by public payment token (no auth required)
   * GET /invoices/public/:token
   */
  @ApiOperation({ summary: 'Get invoice by payment token (public)' })
  @Public()
  @Get('public/:token')
  async getInvoiceByToken(@Param('token') token: string) {
    return this.invoicesService.getInvoiceByToken(token);
  }

  /**
   * Create a new invoice
   * POST /invoices
   */
  @ApiOrgScoped()
  @ApiOperation({ summary: 'Create a new invoice' })
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN', 'PROJECT_MANAGER')
  @Post()
  async createInvoice(@Req() req: any, @Body() dto: CreateInvoiceDto) {
    const ctx = req.orgContext as OrgContext;
    return this.invoicesService.createInvoice(ctx, dto);
  }

  /**
   * Update an invoice
   * PATCH /invoices/:id
   */
  @ApiOrgScoped()
  @ApiOperation({ summary: 'Update an invoice' })
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN', 'PROJECT_MANAGER')
  @Patch(':id')
  async updateInvoice(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.invoicesService.updateInvoice(ctx, id, dto);
  }

  /**
   * Send invoice to customer via email
   * POST /invoices/:id/send
   */
  @ApiOrgScoped()
  @ApiOperation({ summary: 'Send invoice to customer' })
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN', 'PROJECT_MANAGER')
  @Post(':id/send')
  async sendInvoice(@Req() req: any, @Param('id') id: string) {
    const ctx = req.orgContext as OrgContext;
    return this.invoicesService.sendInvoice(ctx, id);
  }

  /**
   * Mark invoice as paid
   * POST /invoices/:id/mark-paid
   */
  @ApiOrgScoped()
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN', 'PROJECT_MANAGER')
  @Post(':id/mark-paid')
  async markAsPaid(@Req() req: any, @Param('id') id: string) {
    const ctx = req.orgContext as OrgContext;
    return this.invoicesService.markAsPaid(ctx, id);
  }

  /**
   * Void an invoice
   * POST /invoices/:id/void
   */
  @ApiOrgScoped()
  @ApiOperation({ summary: 'Void an invoice' })
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN', 'PROJECT_MANAGER')
  @Post(':id/void')
  async voidInvoice(@Req() req: any, @Param('id') id: string) {
    const ctx = req.orgContext as OrgContext;
    return this.invoicesService.voidInvoice(ctx, id);
  }
}
