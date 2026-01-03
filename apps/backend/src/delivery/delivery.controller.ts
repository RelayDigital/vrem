import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  StreamableFile,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { DeliveryService } from './delivery.service';
import { Public } from '../auth/public.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeliveryCustomerGuard } from './delivery-customer.guard';
import { DeliveryCommentGuard } from './delivery-comment.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth-context';
import { DownloadAllDto, AddCommentDto, RequestChangesDto } from './dto/delivery-response.dto';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  /**
   * PUBLIC: Get delivery data by token.
   * Token grants view access to project, media, comments, and approval status.
   * If user is authenticated, determines if they can approve.
   */
  @Public()
  @UseGuards(JwtAuthGuard) // Still runs but allows public access - populates user if authenticated
  @Get(':token')
  async getDeliveryByToken(@Param('token') token: string, @Req() req: any) {
    // User may or may not be authenticated
    const user = req.user as AuthenticatedUser | undefined;
    return this.deliveryService.getDeliveryByToken(token, user?.id);
  }

  /**
   * PUBLIC: Get comments for a delivery by token.
   */
  @Public()
  @Get(':token/comments')
  async getComments(@Param('token') token: string) {
    return this.deliveryService.getComments(token);
  }

  /**
   * PUBLIC: Request a download artifact (new non-streaming approach).
   * Returns artifact status and URL when ready.
   * Client should poll download-status endpoint if not immediately ready.
   */
  @Public()
  @Post(':token/download-request')
  async requestDownload(
    @Param('token') token: string,
    @Body() dto: DownloadAllDto,
  ) {
    return this.deliveryService.requestDownloadArtifact(token, dto.mediaTypes);
  }

  /**
   * PUBLIC: Get download artifact status.
   * Returns the current status and CDN URL when ready.
   */
  @Public()
  @Get(':token/download-status/:artifactId')
  async getDownloadStatus(
    @Param('token') token: string,
    @Param('artifactId') artifactId: string,
  ) {
    return this.deliveryService.getDownloadArtifactStatus(token, artifactId);
  }

  /**
   * PUBLIC: Download all media as a zip file (streaming fallback).
   * Use download-request endpoint for better reliability.
   */
  @Public()
  @Post(':token/download-all')
  @Header('Content-Type', 'application/zip')
  async downloadAll(
    @Param('token') token: string,
    @Body() dto: DownloadAllDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, filename } = await this.deliveryService.createDownloadStream(
      token,
      dto.mediaTypes,
    );

    res.set({
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return new StreamableFile(stream);
  }

  /**
   * PROTECTED: Approve a delivery.
   * Requires authentication as the linked customer.
   */
  @UseGuards(JwtAuthGuard, DeliveryCustomerGuard)
  @Post(':token/approve')
  async approveDelivery(
    @Param('token') token: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.approveDelivery(token, user.id);
  }

  /**
   * PROTECTED: Request changes on a delivery.
   * Requires authentication as the linked customer.
   */
  @UseGuards(JwtAuthGuard, DeliveryCustomerGuard)
  @Post(':token/request-changes')
  async requestChanges(
    @Param('token') token: string,
    @Body() dto: RequestChangesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.requestChanges(token, user.id, dto.feedback);
  }

  /**
   * PROTECTED: Add a comment to a delivery.
   * Requires authentication as the linked customer OR org admin/PM.
   */
  @UseGuards(JwtAuthGuard, DeliveryCommentGuard)
  @Post(':token/comments')
  async addComment(
    @Param('token') token: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.addComment(token, user.id, dto.content);
  }
}
