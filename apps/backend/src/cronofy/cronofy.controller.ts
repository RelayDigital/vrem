import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CronofyService } from './cronofy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';
import { ApiOrgScoped } from '../common/decorators/api-org-scoped.decorator';
import type { OrgContext } from '../auth/auth-context';

@ApiTags('Cronofy')
@ApiOrgScoped()
@Controller('availability')
@UseGuards(JwtAuthGuard, OrgContextGuard)
export class CronofyController {
  constructor(private readonly cronofyService: CronofyService) {}

  /**
   * Get availability for technicians in the organization
   * GET /availability?startDate=2024-01-01&endDate=2024-01-07&technicianIds=id1,id2&duration=60
   */
  @ApiOperation({ summary: 'Get technician availability slots' })
  @Get()
  async getAvailability(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('technicianIds') technicianIds?: string,
    @Query('duration') duration?: string,
  ) {
    const ctx = req.orgContext as OrgContext;

    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    const techIds = technicianIds
      ? technicianIds.split(',').filter(Boolean)
      : undefined;

    return this.cronofyService.getAvailability({
      orgId: ctx.org.id,
      startDate,
      endDate,
      technicianIds: techIds,
      duration: duration ? parseInt(duration, 10) : 60,
    });
  }

  /**
   * Check if a specific slot is available
   * GET /availability/check?technicianId=xxx&scheduledTime=2024-01-01T10:00:00Z&duration=60
   */
  @ApiOperation({ summary: 'Check if a specific time slot is available' })
  @Get('check')
  async checkSlot(
    @Req() req: any,
    @Query('technicianId') technicianId: string,
    @Query('scheduledTime') scheduledTime: string,
    @Query('duration') duration?: string,
  ) {
    const ctx = req.orgContext as OrgContext;

    if (!technicianId || !scheduledTime) {
      throw new BadRequestException('technicianId and scheduledTime are required');
    }

    const isAvailable = await this.cronofyService.isSlotAvailable(
      technicianId,
      new Date(scheduledTime),
      duration ? parseInt(duration, 10) : 60,
      ctx.org.id,
    );

    return { available: isAvailable };
  }
}

