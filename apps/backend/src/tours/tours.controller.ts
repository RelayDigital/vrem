import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ToursService } from './tours.service';
import {
  UpdateTourProgressDto,
  CompleteTourTrackDto,
} from './dto/update-tour-progress.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth-context';
import { TourTrack } from '@prisma/client';

@ApiTags('Tours')
@ApiBearerAuth('bearer')
@Controller('tours')
@UseGuards(JwtAuthGuard)
export class ToursController {
  constructor(private toursService: ToursService) {}

  /**
   * Get the current user's overall tour status and progress
   */
  @ApiOperation({ summary: 'Get user tour status and progress' })
  @Get('status')
  getTourStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.toursService.getUserTourStatus(user.id);
  }

  /**
   * Get progress for a specific tour track
   */
  @ApiOperation({ summary: 'Get progress for a tour track' })
  @Get('progress/:track')
  getTrackProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('track') track: TourTrack,
  ) {
    return this.toursService.getTrackProgress(user.id, track);
  }

  /**
   * Update progress for a specific step
   */
  @ApiOperation({ summary: 'Update progress for a tour step' })
  @Patch('progress')
  updateProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTourProgressDto,
  ) {
    return this.toursService.updateStepProgress(user.id, dto);
  }

  /**
   * Mark an entire track as completed
   */
  @ApiOperation({ summary: 'Mark a tour track as completed' })
  @Post('complete/:track')
  completeTrack(
    @CurrentUser() user: AuthenticatedUser,
    @Param('track') track: TourTrack,
  ) {
    return this.toursService.completeTrack(user.id, track);
  }

  /**
   * Skip/dismiss a specific track
   */
  @ApiOperation({ summary: 'Skip a tour track' })
  @Post('skip/:track')
  skipTrack(
    @CurrentUser() user: AuthenticatedUser,
    @Param('track') track: TourTrack,
  ) {
    return this.toursService.skipTrack(user.id, track);
  }

  /**
   * Dismiss the setup guide widget permanently
   */
  @ApiOperation({ summary: 'Dismiss the setup guide' })
  @Post('dismiss-guide')
  dismissGuide(@CurrentUser() user: AuthenticatedUser) {
    return this.toursService.dismissGuide(user.id);
  }

  /**
   * Reset all tour progress (for testing or re-onboarding)
   */
  @ApiOperation({ summary: 'Reset all tour progress' })
  @Post('reset')
  resetProgress(@CurrentUser() user: AuthenticatedUser) {
    return this.toursService.resetProgress(user.id);
  }

  /**
   * Create a demo project for tour walkthrough
   */
  @ApiOperation({ summary: 'Create a demo project for tour' })
  @Post('demo-project')
  createDemoProject(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-org-id') orgId: string,
  ) {
    if (!orgId) {
      throw new BadRequestException('Organization ID is required. Please ensure you have an organization selected.');
    }
    return this.toursService.createDemoProject(user.id, orgId);
  }

  /**
   * Get the demo project for the current user
   */
  @ApiOperation({ summary: 'Get demo project' })
  @Get('demo-project')
  getDemoProject(@CurrentUser() user: AuthenticatedUser) {
    return this.toursService.getDemoProject(user.id);
  }

  /**
   * Delete the demo project
   */
  @ApiOperation({ summary: 'Delete demo project' })
  @Delete('demo-project')
  deleteDemoProject(@CurrentUser() user: AuthenticatedUser) {
    return this.toursService.deleteDemoProject(user.id);
  }
}
