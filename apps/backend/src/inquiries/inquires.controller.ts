import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InquiriesService } from './inquires.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentOrg } from '../organizations/current-org.decorator';

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  // Public: leads submit inquiries
  @Post()
  createInquiry(@Body() dto: CreateInquiryDto) {
    return this.inquiriesService.createInquiry(dto);
  }

  // Admin + PM only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DISPATCHER, Role.DISPATCHER)
  @Get()
  getAllInquiries() {
    return this.inquiriesService.getAllInquiries();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DISPATCHER, Role.DISPATCHER)
  @Get(':id')
  getInquiryById(@Param('id') id: string) {
    return this.inquiriesService.getInquiryById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DISPATCHER, Role.DISPATCHER)
  @Patch(':id')
  updateInquiry(@Param('id') id: string, @Body() dto: UpdateInquiryDto) {
    return this.inquiriesService.updateInquiry(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DISPATCHER, Role.DISPATCHER)
  @Post(':id/convert')
  convertToProject(@Param('id') id: string, @CurrentOrg() org: { id: string }) {
    return this.inquiriesService.convertToProject(id, org.id);
  }
}
