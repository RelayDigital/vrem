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
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
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
import { AuditLogger, AuditEventType, maskToken } from '../config/audit-log';
import { ApiOrgScoped } from '../common/decorators/api-org-scoped.decorator';

@ApiTags('Delivery')
@Controller('delivery')
export class DeliveryController {
  private readonly audit: AuditLogger;

  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly artifactWorker: ArtifactWorkerService,
  ) {
    this.audit = new AuditLogger(new Logger(DeliveryController.name));
  }

  /**
   * PUBLIC: Get delivery data by token.
   * Token grants view access to project, media, comments, and approval status.
   * If user is authenticated, determines if they can approve.
   */
  // Rate limit: 30 requests per minute per IP (generous for page loads)
  @ApiOperation({ summary: 'Get delivery data by public token' })
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Public()
  @UseGuards(JwtAuthGuard) // Still runs but allows public access - populates user if authenticated
  @Get(':token')
  async getDeliveryByToken(@Param('token') token: string, @Req() req: any) {
    // User may or may not be authenticated
    const user = req.user as AuthenticatedUser | undefined;
    const result = await this.deliveryService.getDeliveryByToken(token, user?.id);

    // Audit log the page view
    this.audit.log(AuditEventType.DELIVERY_PAGE_VIEW, req, {
      projectId: result.project.id,
      orgId: result.organization.id,
      tokenMasked: maskToken(token),
      authenticated: !!user,
    });

    return result;
  }

  /**
   * PUBLIC: Get comments for a delivery by token.
   */
  // Rate limit: 30 requests per minute per IP
  @ApiOperation({ summary: 'Get comments for a delivery' })
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Public()
  @Get(':token/comments')
  async getComments(@Param('token') token: string, @Req() req: any) {
    const result = await this.deliveryService.getComments(token);

    this.audit.log(AuditEventType.DELIVERY_COMMENTS_VIEW, req, {
      tokenMasked: maskToken(token),
      commentCount: result.length,
    });

    return result;
  }

  /**
   * PUBLIC: Request a download artifact (new non-streaming approach).
   * Returns artifact status and URL when ready.
   * Client should poll download-status endpoint if not immediately ready.
   */
  // Rate limit: 5 download requests per minute per IP (expensive operation)
  @ApiOperation({ summary: 'Request a download artifact' })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Public()
  @Post(':token/download-request')
  async requestDownload(
    @Param('token') token: string,
    @Body() dto: DownloadAllDto,
    @Req() req: any,
  ) {
    const result = await this.deliveryService.requestDownloadArtifact(token, dto.mediaTypes);

    this.audit.log(AuditEventType.DOWNLOAD_REQUEST, req, {
      tokenMasked: maskToken(token),
      artifactId: result.artifactId,
      status: result.status,
      mediaTypes: dto.mediaTypes || 'all',
    });

    return result;
  }

  /**
   * PUBLIC: Get download artifact status.
   * Returns the current status and CDN URL when ready.
   */
  // Rate limit: 60 requests per minute per IP (polling endpoint)
  @ApiOperation({ summary: 'Get download artifact status' })
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @Public()
  @Get(':token/download-status/:artifactId')
  async getDownloadStatus(
    @Param('token') token: string,
    @Param('artifactId') artifactId: string,
    @Req() req: any,
  ) {
    const result = await this.deliveryService.getDownloadArtifactStatus(token, artifactId);

    // Only log significant status checks (READY or FAILED), not every poll
    if (result.status === 'READY' || result.status === 'FAILED') {
      this.audit.log(AuditEventType.DOWNLOAD_STATUS_CHECK, req, {
        tokenMasked: maskToken(token),
        artifactId,
        status: result.status,
      });
    }

    return result;
  }

  /**
   * PROTECTED: Approve a delivery.
   * Requires authentication as the linked customer.
   */
  @ApiOperation({ summary: 'Approve a delivery' })
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, DeliveryCustomerGuard)
  @Post(':token/approve')
  async approveDelivery(
    @Param('token') token: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
  ) {
    const result = await this.deliveryService.approveDelivery(token, user.id);

    this.audit.log(AuditEventType.DELIVERY_APPROVE, req, {
      tokenMasked: maskToken(token),
      approvalStatus: result.clientApprovalStatus,
    });

    return result;
  }

  /**
   * PROTECTED: Request changes on a delivery.
   * Requires authentication as the linked customer.
   */
  @ApiOperation({ summary: 'Request changes on a delivery' })
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, DeliveryCustomerGuard)
  @Post(':token/request-changes')
  async requestChanges(
    @Param('token') token: string,
    @Body() dto: RequestChangesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
  ) {
    const result = await this.deliveryService.requestChanges(token, user.id, dto.feedback);

    this.audit.log(AuditEventType.DELIVERY_REQUEST_CHANGES, req, {
      tokenMasked: maskToken(token),
      approvalStatus: result.clientApprovalStatus,
      hasFeedback: !!dto.feedback,
    });

    return result;
  }

  /**
   * PROTECTED: Add a comment to a delivery.
   * Requires authentication as the linked customer OR org admin/PM.
   */
  @ApiOperation({ summary: 'Add a comment to a delivery' })
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, DeliveryCommentGuard)
  @Post(':token/comments')
  async addComment(
    @Param('token') token: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
  ) {
    const result = await this.deliveryService.addComment(token, user.id, dto.content);

    this.audit.log(AuditEventType.DELIVERY_COMMENT_ADD, req, {
      tokenMasked: maskToken(token),
      commentId: result.id,
    });

    return result;
  }

  // =============================
  // Admin / Internal Endpoints
  // =============================

  /**
   * ADMIN: Retry a failed artifact generation.
   * Only OWNER, ADMIN, or PROJECT_MANAGER roles can retry artifacts.
   * The artifact must belong to a project in the user's org.
   */
  @ApiOperation({ summary: 'Retry a failed artifact generation' })
  @ApiOrgScoped()
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
  @ApiExcludeEndpoint()
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

  /**
   * CRON: Serverless-safe endpoint for artifact generation.
   *
   * Call this endpoint periodically (every 30-60 seconds) from an external scheduler
   * to process pending download artifacts when no persistent worker is running.
   *
   * Protected by X-CRON-SECRET header (env: CRON_SECRET).
   *
   * Example cURL:
   *   curl -X POST https://api.example.com/delivery/admin/run-artifact-worker \
   *     -H "X-CRON-SECRET: your-secret-here"
   *
   * Returns:
   *   { success: true, processed: number, recovered: number }
   *
   * - processed: Number of artifacts moved from PENDING to GENERATING/READY
   * - recovered: Number of stuck GENERATING artifacts reset to PENDING for retry
   */
  @ApiExcludeEndpoint()
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 12 } }) // Max 12 calls per minute
  @Post('admin/run-artifact-worker')
  async runArtifactWorker(@Headers('x-cron-secret') cronSecret?: string, @Req() req?: any) {
    // Validate cron secret
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) {
      // Endpoint disabled when CRON_SECRET not configured
      throw new NotFoundException('Not found');
    }

    if (!cronSecret || cronSecret !== expectedSecret) {
      // Log failed attempt without exposing secrets
      this.audit.log(AuditEventType.DELIVERY_PAGE_VIEW, req, {
        action: 'artifact_worker_cron_auth_failed',
        hasSecret: !!cronSecret,
      });
      throw new NotFoundException('Not found');
    }

    const result = await this.artifactWorker.poll();

    // Log successful cron run (no sensitive data)
    this.audit.log(AuditEventType.DELIVERY_PAGE_VIEW, req, {
      action: 'artifact_worker_cron_success',
      processed: result.processed,
      recovered: result.recovered,
    });

    return {
      success: true,
      processed: result.processed,
      recovered: result.recovered,
    };
  }
}
