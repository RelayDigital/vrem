import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UseGuards,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { IcsFeedService } from './ics-feed.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller()
export class IcsFeedController {
  private readonly logger = new Logger(IcsFeedController.name);

  constructor(private icsFeedService: IcsFeedService) {}

  /**
   * Get or create ICS feed URL for current user
   */
  @Get('calendar-integrations/ics-feed')
  @UseGuards(JwtAuthGuard)
  async getIcsFeed(@CurrentUser() user: { id: string }) {
    this.logger.log(`Getting ICS feed for user ${user.id}`);
    return this.icsFeedService.getOrCreateFeed(user.id);
  }

  /**
   * Regenerate ICS feed token (invalidates old URL)
   */
  @Post('calendar-integrations/ics-feed/regenerate')
  @UseGuards(JwtAuthGuard)
  async regenerateIcsFeed(@CurrentUser() user: { id: string }) {
    this.logger.log(`Regenerating ICS feed for user ${user.id}`);
    return this.icsFeedService.regenerateFeedToken(user.id);
  }

  /**
   * Public endpoint to serve ICS calendar file
   * No auth required - security is via the unique feed token
   */
  @Get('ics/:token.ics')
  async serveIcsFile(
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    try {
      const icsContent = await this.icsFeedService.generateIcsContent(token);

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="vrem-calendar.ics"');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(icsContent);
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: 'Calendar feed not found' });
      } else {
        throw error;
      }
    }
  }
}
