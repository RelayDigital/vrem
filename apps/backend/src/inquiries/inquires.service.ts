import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';

@Injectable()
export class InquiriesService {
  constructor(private prisma: PrismaService) {}

  async createInquiry(dto: CreateInquiryDto) {
    return this.prisma.inquiry.create({ data: dto });
  }

  async getAllInquiries() {
    return this.prisma.inquiry.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getInquiryById(id: string) {
    const inquiry = await this.prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return inquiry;
  }

  async updateInquiry(id: string, dto: UpdateInquiryDto) {
    const inquiry = await this.getInquiryById(id);

    return this.prisma.inquiry.update({
      where: { id },
      data: dto,
    });
  }

  async convertToProject(id: string, orgId: string) {
    const inquiry = await this.getInquiryById(id);

    const project = await this.prisma.project.create({
      data: {
        orgId,
        agentId: '', // to be filled by PM later or from auth
        address: inquiry.address || '',
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
