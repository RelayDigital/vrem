import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DeliveryService } from './delivery.service';
import { ArtifactWorkerService } from './artifact-worker.service';
import { Public } from '../auth/public.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';
import { OrgRolesGuard } from '../auth/org-roles.guard';
import { OrgRoles } from '../auth/org-roles.decorator';
import { DeliveryCustomerGuard } from './delivery-customer.guard';
import { DeliveryCommentGuard } from './delivery-comment.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth-context';
import { DownloadAllDto, AddCommentDto, RequestChangesDto, RetryArtifactDto } from './dto/delivery-response.dto';

@Controller('delivery')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly artifactWorker: ArtifactWorkerService,
  ) {}

  /**
   * PUBLIC: Get delivery data by token.
   * Token grants view access to project, media, comments, and approval status.
   * If user is authenticated, determines if they can approve.
   */
  // Rate limit: 30 requests per minute per IP (generous for page loads)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
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
  // Rate limit: 30 requests per minute per IP
  @Throttle({ default: { ttl: 60000, limit: 30 } })
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
  // Rate limit: 5 download requests per minute per IP (expensive operation)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
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
  // Rate limit: 60 requests per minute per IP (polling endpoint)
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @Public()
  @Get(':token/download-status/:artifactId')
  async getDownloadStatus(
    @Param('token') token: string,
    @Param('artifactId') artifactId: string,
  ) {
    return this.deliveryService.getDownloadArtifactStatus(token, artifactId);
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

  // =============================
  // Admin / Internal Endpoints
  // =============================

  /**
   * ADMIN: Retry a failed artifact generation.
   * Only OWNER, ADMIN, or PROJECT_MANAGER roles can retry artifacts.
   * The artifact must belong to a project in the user's org.
   */
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('PERSONAL_OWNER', 'OWNER', 'ADMIN', 'PROJECT_MANAGER')
  @Post('admin/retry-artifact')
  async retryArtifact(@Body() dto: RetryArtifactDto) {
    try {
      const result = await this.artifactWorker.retryFailedArtifact(dto.artifactId);
      if (!result) {
        throw new NotFoundException('Artifact not found');
      }
      return { success: true, artifactId: result };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * INTERNAL: Cron-like endpoint for processing pending artifacts.
   * For serverless deployments, this can be called periodically by an external scheduler.
   * Protected by a secret token in the Authorization header.
   */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 12 } }) // Max 12 calls per minute
  @Post('internal/process-artifacts')
  async processArtifacts(@Headers('authorization') authHeader?: string) {
    // Validate internal API token
    const expectedToken = process.env.INTERNAL_API_TOKEN;
    if (!expectedToken) {
      throw new NotFoundException('Not found'); // Hide endpoint when not configured
    }

    const providedToken = authHeader?.replace('Bearer ', '');
    if (providedToken !== expectedToken) {
      throw new NotFoundException('Not found'); // Don't reveal this is an auth failure
    }

    const result = await this.artifactWorker.poll();
    return {
      success: true,
      processed: result.processed,
      recovered: result.recovered,
    };
  }
}
