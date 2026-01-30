import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { AuthorizationService } from '../auth/authorization.service';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceLineItemDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private authorization: AuthorizationService,
  ) {}

  /**
   * List all invoices for the organization
   */
  async listInvoices(ctx: OrgContext) {
    return this.prisma.invoice.findMany({
      where: { orgId: ctx.org.id },
      include: {
        customer: true,
        project: {
          select: {
            id: true,
            addressLine1: true,
            city: true,
            status: true,
            scheduledTime: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single invoice by ID
   */
  async getInvoice(ctx: OrgContext, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        project: {
          select: {
            id: true,
            addressLine1: true,
            city: true,
            region: true,
            status: true,
            scheduledTime: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            legalName: true,
            logoUrl: true,
            primaryEmail: true,
            phone: true,
            addressLine1: true,
            city: true,
            region: true,
            postalCode: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.orgId !== ctx.org.id) {
      throw new ForbiddenException('Invoice does not belong to your organization');
    }

    return invoice;
  }

  /**
   * Get invoice by public payment token (no auth required)
   */
  async getInvoiceByToken(token: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { paymentToken: token },
      include: {
        customer: true,
        project: {
          select: {
            id: true,
            addressLine1: true,
            city: true,
            status: true,
            scheduledTime: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            legalName: true,
            logoUrl: true,
            primaryEmail: true,
            phone: true,
            addressLine1: true,
            city: true,
            region: true,
            postalCode: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Create a new invoice
   */
  async createInvoice(ctx: OrgContext, dto: CreateInvoiceDto) {
    // Calculate line item totals
    const items = dto.items.map((item) => ({
      ...item,
      total: item.total ?? item.quantity * item.unitPrice,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = dto.taxRate ?? 0;
    const taxAmount = Math.round(subtotal * taxRate);
    const total = subtotal + taxAmount;

    // Validate customer belongs to org if provided
    if (dto.customerId) {
      const customer = await this.prisma.organizationCustomer.findFirst({
        where: { id: dto.customerId, orgId: ctx.org.id },
      });
      if (!customer) {
        throw new ForbiddenException('Customer does not belong to your organization');
      }
    }

    // Validate project belongs to org if provided
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, orgId: ctx.org.id },
      });
      if (!project) {
        throw new ForbiddenException('Project does not belong to your organization');
      }
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        orgId: ctx.org.id,
        customerId: dto.customerId,
        projectId: dto.projectId,
        items: items as any,
        subtotal,
        taxRate,
        taxAmount,
        total,
        currency: dto.currency || 'usd',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
      },
      include: {
        customer: true,
        project: {
          select: {
            id: true,
            addressLine1: true,
            city: true,
            status: true,
          },
        },
      },
    });

    this.logger.log(`Invoice ${invoice.invoiceNumber} created for org ${ctx.org.id}`);
    return invoice;
  }

  /**
   * Update an invoice (only DRAFT invoices can be edited)
   */
  async updateInvoice(ctx: OrgContext, invoiceId: string, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.orgId !== ctx.org.id) {
      throw new ForbiddenException('Invoice does not belong to your organization');
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be edited');
    }

    const updateData: any = {};

    if (dto.items) {
      const items = dto.items.map((item) => ({
        ...item,
        total: item.total ?? item.quantity * item.unitPrice,
      }));
      updateData.items = items;
      updateData.subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
      const taxRate = dto.taxRate ?? invoice.taxRate ?? 0;
      updateData.taxRate = taxRate;
      updateData.taxAmount = Math.round(updateData.subtotal * taxRate);
      updateData.total = updateData.subtotal + updateData.taxAmount;
    }

    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.taxRate !== undefined && !dto.items) {
      // Recalculate tax if only tax rate changed
      updateData.taxRate = dto.taxRate;
      updateData.taxAmount = Math.round(invoice.subtotal * dto.taxRate);
      updateData.total = invoice.subtotal + updateData.taxAmount;
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        customer: true,
        project: {
          select: {
            id: true,
            addressLine1: true,
            city: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Send invoice to customer via email
   */
  async sendInvoice(ctx: OrgContext, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        organization: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.orgId !== ctx.org.id) {
      throw new ForbiddenException('Invoice does not belong to your organization');
    }

    if (!invoice.customer?.email) {
      throw new BadRequestException('Customer does not have an email address');
    }

    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('Cannot send a paid or voided invoice');
    }

    // Send email
    await this.emailService.sendInvoiceEmail(
      invoice.customer.email,
      invoice.customer.name,
      invoice.organization.name,
      invoice.invoiceNumber,
      invoice.total,
      invoice.currency,
      invoice.dueDate,
      invoice.paymentToken!,
    );

    // Update status to SENT
    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: invoice.status === InvoiceStatus.DRAFT ? InvoiceStatus.SENT : invoice.status,
        sentAt: new Date(),
      },
      include: { customer: true },
    });

    this.logger.log(`Invoice ${invoice.invoiceNumber} sent to ${invoice.customer.email}`);
    return updated;
  }

  /**
   * Mark invoice as paid manually
   */
  async markAsPaid(ctx: OrgContext, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.orgId !== ctx.org.id) {
      throw new ForbiddenException('Invoice does not belong to your organization');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice is already paid');
    }

    if (invoice.status === InvoiceStatus.VOID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cannot mark a voided or cancelled invoice as paid');
    }

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
      include: { customer: true },
    });

    // Also update the linked project's payment info if applicable
    if (invoice.projectId) {
      await this.prisma.project.update({
        where: { id: invoice.projectId },
        data: {
          paidAt: new Date(),
          paymentAmount: invoice.total,
          paymentCurrency: invoice.currency,
        },
      });
    }

    this.logger.log(`Invoice ${invoice.invoiceNumber} marked as paid`);
    return updated;
  }

  /**
   * Void an invoice
   */
  async voidInvoice(ctx: OrgContext, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.orgId !== ctx.org.id) {
      throw new ForbiddenException('Invoice does not belong to your organization');
    }

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('Invoice is already voided');
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.VOID,
        voidedAt: new Date(),
      },
      include: { customer: true },
    });
  }

  /**
   * Auto-create a draft invoice when a project is delivered (INVOICE_AFTER_DELIVERY mode)
   */
  async autoCreateInvoiceForProject(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        customer: true,
        organization: true,
      },
    });

    if (!project || !project.customer) {
      return;
    }

    // Check if an invoice already exists for this project
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: {
        projectId,
        status: { not: InvoiceStatus.VOID },
      },
    });

    if (existingInvoice) {
      this.logger.log(`Invoice already exists for project ${projectId}, skipping auto-creation`);
      return;
    }

    // Parse notes to extract service details
    const notes = project.notes || '';
    const addressParts = [project.addressLine1, project.city, project.region].filter(Boolean);
    const description = `Photography services at ${addressParts.join(', ')}`;

    // Create a single line item based on project details
    const items = [{
      description,
      quantity: 1,
      unitPrice: project.paymentAmount || 0,
      total: project.paymentAmount || 0,
    }];

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);

    await this.prisma.invoice.create({
      data: {
        orgId: project.orgId,
        customerId: project.customerId,
        projectId: project.id,
        items: items as any,
        subtotal,
        taxAmount: 0,
        total: subtotal,
        currency: project.paymentCurrency || 'usd',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        notes: `Auto-generated invoice for project delivery`,
      },
    });

    this.logger.log(`Auto-created draft invoice for project ${projectId}`);
  }
}
