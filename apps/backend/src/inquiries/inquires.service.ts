import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';

@Injectable()
export class InquiriesService {
  constructor(
    private prisma: PrismaService,
    private authorization: AuthorizationService,
  ) {}

  // Public endpoint - no authorization needed
  async createInquiry(dto: CreateInquiryDto) {
    return this.prisma.inquiry.create({ data: dto });
  }

  async getAllInquiries(ctx: OrgContext, user: AuthenticatedUser) {
    if (!this.authorization.canViewInquiries(ctx, user)) {
      throw new ForbiddenException('You are not allowed to view inquiries');
    }

    // Inquiries are global (not org-scoped), but only authorized users can view them
    return this.prisma.inquiry.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInquiryById(
    id: string,
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    if (!this.authorization.canViewInquiries(ctx, user)) {
      throw new ForbiddenException('You are not allowed to view inquiries');
    }

    const inquiry = await this.prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return inquiry;
  }

  async updateInquiry(
    id: string,
    dto: UpdateInquiryDto,
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    if (!this.authorization.canViewInquiries(ctx, user)) {
      throw new ForbiddenException('You are not allowed to update inquiries');
    }

    const inquiry = await this.prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');

    return this.prisma.inquiry.update({
      where: { id },
      data: dto,
    });
  }

  async convertToProject(
    id: string,
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    if (!this.authorization.canConvertInquiry(ctx, user)) {
      throw new ForbiddenException(
        'You are not allowed to convert inquiries to projects',
      );
    }

    const inquiry = await this.prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');

    // Create project in the current org context
    const project = await this.prisma.project.create({
      data: {
        orgId: ctx.org.id,
        addressLine1: inquiry.address || null,
        notes: inquiry.message || '',
        scheduledTime: new Date(), // placeholder - updated later
      },
    });

    await this.prisma.inquiry.update({
      where: { id },
      data: { status: 'CONVERTED_TO_PROJECT' },
    });

    return project;
  }
}
