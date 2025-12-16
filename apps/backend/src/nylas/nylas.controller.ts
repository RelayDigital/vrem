import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Query,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  Logger,
  Headers,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Response } from 'express';
import { NylasService } from './nylas.service';
import { CalendarSyncService } from './calendar-sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth-context';
import { FRONTEND_URL } from '../config/urls.config';
import * as crypto from 'crypto';

@Controller('nylas')
export class NylasController {
  private readonly logger = new Logger(NylasController.name);

  constructor(
    private nylas: NylasService,
    private calendarSync: CalendarSyncService,
  ) {}

  // =============================
  // OAuth Flow
  // =============================

  /**
   * Start OAuth flow - returns URL to redirect user to
   */
  @Get('oauth/start')
  @UseGuards(JwtAuthGuard)
  getOAuthUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Query('provider') provider: string,
  ): { url: string } {
    if (!provider || !['google', 'microsoft'].includes(provider)) {
      throw new BadRequestException('Provider must be "google" or "microsoft"');
    }

    const url = this.nylas.getOAuthUrl(user.id, provider as 'google' | 'microsoft');
    return { url };
  }

  /**
   * OAuth callback - handles the redirect from Nylas
   */
  @Public()
  @Get('oauth/callback')
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!code || !state) {
      this.logger.error('OAuth callback missing code or state');
      res.redirect(`${FRONTEND_URL}/settings/calendar?error=missing_params`);
      return;
    }

    try {
      const { userId } = await this.nylas.handleOAuthCallback(code, state);
      this.logger.log(`OAuth completed for user ${userId}`);

      // Auto-sync all existing assigned projects to the newly connected calendar
      // Run in background (fire-and-forget) so redirect isn't delayed
      this.calendarSync.syncAllProjectsForTechnician(userId).then((result) => {
        this.logger.log(`Auto-synced ${result.synced} projects for user ${userId} after calendar connection`);
      }).catch((error) => {
        this.logger.error(`Failed to auto-sync projects for user ${userId}`, error);
      });

      res.redirect(`${FRONTEND_URL}/settings/calendar?success=true`);
    } catch (error) {
      this.logger.error('OAuth callback failed', error);
      res.redirect(`${FRONTEND_URL}/settings/calendar?error=oauth_failed`);
    }
  }

  /**
   * Disconnect calendar
   */
  @Delete('connection/:integrationId')
  @UseGuards(JwtAuthGuard)
  async disconnect(
    @CurrentUser() user: AuthenticatedUser,
    @Param('integrationId') integrationId: string,
  ): Promise<{ success: boolean }> {
    await this.nylas.disconnect(user.id, integrationId);
    return { success: true };
  }

  // =============================
  // Connection Status
  // =============================

  /**
   * Get calendar connection status
   */
  @Get('connection')
  @UseGuards(JwtAuthGuard)
  async getConnectionStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.nylas.getConnectionStatus(user.id);
  }

  /**
   * Check if Nylas is configured
   */
  @Public()
  @Get('configured')
  isConfigured(): { configured: boolean } {
    return { configured: this.nylas.isNylasConfigured() };
  }

  // =============================
  // Calendar Management
  // =============================

  /**
   * Get user's calendars
   */
  @Get('calendars')
  @UseGuards(JwtAuthGuard)
  async getCalendars(@CurrentUser() user: AuthenticatedUser) {
    const calendars = await this.nylas.getUserCalendars(user.id);
    return { calendars };
  }

  /**
   * Set write target calendar
   */
  @Patch('calendars/:integrationId/write-target')
  @UseGuards(JwtAuthGuard)
  async setWriteTarget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('integrationId') integrationId: string,
    @Body('calendarId') calendarId: string,
  ): Promise<{ success: boolean }> {
    if (!calendarId) {
      throw new BadRequestException('calendarId is required');
    }
    await this.nylas.setWriteTarget(user.id, integrationId, calendarId);
    return { success: true };
  }

  // =============================
  // Availability
  // =============================

  /**
   * Get available time slots for scheduling
   */
  @Get('availability')
  @UseGuards(JwtAuthGuard)
  async getAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('durationMins') durationMins: string,
    @Query('timezone') timezone?: string,
    @Query('technicianId') technicianId?: string,
  ) {
    if (!start || !end) {
      throw new BadRequestException('start and end query parameters are required');
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    const duration = parseInt(durationMins, 10) || 60;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    // Use provided technicianId or current user
    const targetUserId = technicianId || user.id;

    const slots = await this.nylas.getAvailableSlots(
      targetUserId,
      startDate,
      endDate,
      duration,
      timezone || 'America/New_York',
    );

    return {
      slots: slots.filter(s => s.available),
      allSlots: slots,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      durationMins: duration,
    };
  }

  // =============================
  // Project Calendar Sync
  // =============================

  /**
   * Get sync status for a project
   */
  @Get('projects/:projectId/sync-status')
  @UseGuards(JwtAuthGuard)
  async getProjectSyncStatus(@Param('projectId') projectId: string) {
    return this.calendarSync.getProjectSyncStatus(projectId);
  }

  /**
   * Reconcile a project's calendar event
   */
  @Post('projects/:projectId/reconcile')
  @UseGuards(JwtAuthGuard)
  async reconcileProject(@Param('projectId') projectId: string) {
    return this.calendarSync.reconcileProject(projectId);
  }

  /**
   * Sync all assigned projects to calendar
   * Useful after initially connecting a calendar
   */
  @Post('sync-all')
  @UseGuards(JwtAuthGuard)
  async syncAllProjects(@CurrentUser() user: AuthenticatedUser) {
    return this.calendarSync.syncAllProjectsForTechnician(user.id);
  }

  // =============================
  // Webhooks
  // =============================

  /**
   * Nylas webhook endpoint
   * Handles calendar event changes from Nylas
   */
  @Public()
  @Post('webhooks')
  async handleWebhook(
    @Headers('x-nylas-signature') signature: string,
    @Req() req: RawBodyRequest<any>,
    @Body() body: any,
  ): Promise<{ status: string }> {
    // Verify webhook signature
    const webhookSecret = process.env.NYLAS_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const rawBody = req.rawBody?.toString() || JSON.stringify(body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        this.logger.warn('Invalid webhook signature');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    this.logger.log(`Received Nylas webhook: ${body.type}`);

    // Handle different webhook types
    try {
      switch (body.type) {
        case 'event.created':
        case 'event.updated':
          await this.handleEventWebhook(body.data, 'updated');
          break;
        case 'event.deleted':
          await this.handleEventWebhook(body.data, 'deleted');
          break;
        case 'grant.expired':
        case 'grant.deleted':
          await this.handleGrantWebhook(body.data);
          break;
        default:
          this.logger.debug(`Unhandled webhook type: ${body.type}`);
      }
    } catch (error) {
      this.logger.error('Webhook processing error', error);
    }

    return { status: 'ok' };
  }

  /**
   * Webhook challenge verification (Nylas sends GET request to verify)
   */
  @Public()
  @Get('webhooks')
  verifyWebhook(@Query('challenge') challenge: string): string {
    return challenge;
  }

  private async handleEventWebhook(
    data: { object: { id: string; grant_id: string } },
    changeType: 'updated' | 'deleted',
  ): Promise<void> {
    const { id: eventId, grant_id: grantId } = data.object;

    if (!eventId || !grantId) {
      this.logger.warn('Webhook missing event or grant ID');
      return;
    }

    await this.calendarSync.handleExternalEventChange(eventId, grantId, changeType);
  }

  private async handleGrantWebhook(data: { object: { id: string } }): Promise<void> {
    const grantId = data.object.id;

    if (!grantId) {
      return;
    }

    // Mark all integrations with this grant as expired
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.userCalendarIntegration.updateMany({
      where: { nylasGrantId: grantId },
      data: { status: 'EXPIRED' },
    });

    await prisma.$disconnect();

    this.logger.log(`Grant ${grantId} expired - marked integrations as expired`);
  }
}
