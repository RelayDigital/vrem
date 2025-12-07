import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth-context';

@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * GET /me/notifications
   * Returns all notifications for the current user (invitations + project assignments)
   */
  @Get('me/notifications')
  async getMyNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getNotificationsForUser(user);
  }

  /**
   * POST /invitations/:id/accept
   * Accept an invitation
   */
  @Post('invitations/:id/accept')
  async acceptInvitation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.notificationsService.acceptInvitation(id, user);
    return { success: true };
  }

  /**
   * POST /invitations/:id/decline
   * Decline an invitation
   */
  @Post('invitations/:id/decline')
  async declineInvitation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.notificationsService.declineInvitation(id, user);
    return { success: true };
  }

  /**
   * POST /notifications/:id/read
   * Mark a notification as read
   */
  @Post('notifications/:id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.notificationsService.markNotificationAsRead(id, user);
    return { success: true };
  }

  /**
   * GET /organizations/:id/public
   * Get public organization info for viewing from an invitation
   */
  @Get('organizations/:id/public')
  async getOrganizationPublic(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.getOrganizationPublicInfo(id, user);
  }
}

