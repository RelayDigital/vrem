import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth-context';

@ApiTags('Notifications')
@ApiBearerAuth('bearer')
@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * GET /me/notifications
   * Returns all notifications for the current user (invitations + project assignments)
   */
  @ApiOperation({ summary: 'Get my notifications' })
  @Get('me/notifications')
  async getMyNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getNotificationsForUser(user);
  }

  /**
   * POST /invitations/:id/accept
   * Accept an invitation
   */
  @ApiOperation({ summary: 'Accept an invitation' })
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
  @ApiOperation({ summary: 'Decline an invitation' })
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
  @ApiOperation({ summary: 'Mark a notification as read' })
  @Post('notifications/:id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.notificationsService.markNotificationAsRead(id, user);
    return { success: true };
  }

  /**
   * POST /notifications/read-all
   * Mark all notifications as read
   */
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Post('notifications/read-all')
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllNotificationsAsRead(user);
  }

  /**
   * GET /notifications/count
   * Get unread notification count
   */
  @ApiOperation({ summary: 'Get unread notification count' })
  @Get('notifications/count')
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(user);
  }

  /**
   * GET /organizations/:id/public
   * Get public organization info for viewing from an invitation
   */
  @ApiOperation({ summary: 'Get public organization info' })
  @Get('organizations/:id/public')
  async getOrganizationPublic(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.getOrganizationPublicInfo(id, user);
  }
}

