import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InquiriesService } from './inquires.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';
import { OrgRolesGuard } from '../auth/org-roles.guard';
import { OrgRoles } from '../auth/org-roles.decorator';
import { Public } from '../auth/public.decorator';
import type { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { ApiOrgScoped } from '../common/decorators/api-org-scoped.decorator';

@ApiTags('Inquiries')
@Controller('inquiries')
@UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  // Public: leads submit inquiries (no auth required)
  // Rate limit: 10 inquiries per minute per IP (prevent spam)
  @ApiOperation({ summary: 'Submit a public inquiry' })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Public()
  @Post()
  createInquiry(@Body() dto: CreateInquiryDto) {
    return this.inquiriesService.createInquiry(dto);
  }

  // OWNER, ADMIN, PROJECT_MANAGER can view inquiries
  @ApiOperation({ summary: 'List all inquiries' })
  @ApiOrgScoped()
  @OrgRoles('PERSONAL_OWNER', 'OWNER', 'ADMIN', 'PROJECT_MANAGER')
  @Get()
  getAllInquiries(@Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.inquiriesService.getAllInquiries(ctx, user);
  }

  @ApiOperation({ summary: 'Get inquiry by ID' })
  @ApiOrgScoped()
  @OrgRoles('PERSONAL_OWNER', 'OWNER', 'ADMIN', 'PROJECT_MANAGER')
  @Get(':id')
  getInquiryById(@Param('id') id: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.inquiriesService.getInquiryById(id, ctx, user);
  }

  @ApiOperation({ summary: 'Update an inquiry' })
  @ApiOrgScoped()
  @OrgRoles('PERSONAL_OWNER', 'OWNER', 'ADMIN', 'PROJECT_MANAGER')
  @Patch(':id')
  updateInquiry(@Param('id') id: string, @Body() dto: UpdateInquiryDto, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.inquiriesService.updateInquiry(id, dto, ctx, user);
  }

  @ApiOperation({ summary: 'Convert inquiry to a project' })
  @ApiOrgScoped()
  @OrgRoles('PERSONAL_OWNER', 'OWNER', 'ADMIN', 'PROJECT_MANAGER')
  @Post(':id/convert')
  convertToProject(@Param('id') id: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.inquiriesService.convertToProject(id, ctx, user);
  }
}
