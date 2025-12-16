import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityStatusDto, WorkHoursDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth-context';

@Controller('user-availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  /**
   * Get current user's availability settings (status + work hours)
   */
  @Get()
  getMyAvailability(@CurrentUser() user: AuthenticatedUser) {
    return this.availabilityService.getUserAvailability(user.id);
  }

  /**
   * Update current user's availability status (available/unavailable toggle)
   */
  @Patch('status')
  updateAvailabilityStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AvailabilityStatusDto,
  ) {
    return this.availabilityService.updateAvailabilityStatus(user.id, dto);
  }

  /**
   * Update work hours for a specific day
   */
  @Patch('work-hours')
  updateWorkHours(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WorkHoursDto,
  ) {
    return this.availabilityService.updateWorkHours(user.id, dto);
  }

  /**
   * Update all work hours at once
   */
  @Put('work-hours')
  updateAllWorkHours(
    @CurrentUser() user: AuthenticatedUser,
    @Body() workHours: WorkHoursDto[],
  ) {
    return this.availabilityService.updateAllWorkHours(user.id, workHours);
  }
}
