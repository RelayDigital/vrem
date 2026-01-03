import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { ProjectChatChannel, MediaType, ClientApprovalStatus, DownloadArtifactStatus, DownloadArtifactType } from '@prisma/client';
import { DeliveryResponseDto, MediaDto, CommentDto } from './dto/delivery-response.dto';
import * as crypto from 'crypto';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  // Storage configuration - checked once at startup
  private readonly storageConfigured: boolean;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private emailService: EmailService,
  ) {
    // Check storage configuration at startup
    const publicKey = process.env.UPLOADCARE_PUBLIC_KEY;
    const privateKey = process.env.UPLOADCARE_PRIVATE_KEY;
    this.storageConfigured = !!(publicKey && privateKey);

    if (!this.storageConfigured) {
      this.logger.warn(
        'UPLOADCARE_PUBLIC_KEY and UPLOADCARE_PRIVATE_KEY not configured. ' +
        '"Download All" feature will be disabled. ' +
        'Set these environment variables to enable bulk download functionality.',
      );
    } else {
      this.logger.log('Storage configured: Uploadcare. "Download All" feature enabled.');
    }
  }

  /**
   * Check if storage is configured for download artifacts.
   */
  isStorageConfigured(): boolean {
    return this.storageConfigured;
  }

  /**
   * Get delivery data by token.
   * Public access - token grants view access.
   */
  async getDeliveryByToken(
    token: string,
    currentUserId?: string,
  ): Promise<DeliveryResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { deliveryToken: token },
      include: {
        organization: true,
        media: {
          orderBy: { createdAt: 'desc' },
        },
        messages: {
          where: { channel: ProjectChatChannel.CUSTOMER },
          include: { user: true },
          orderBy: { timestamp: 'asc' },
        },
        customer: true,
        clientApprovedBy: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Delivery not found or invalid token');
    }

    // Check if delivery is enabled
    if (!project.deliveryEnabledAt) {
      throw new NotFoundException('Delivery is not enabled for this project');
    }

    // Determine if current user can approve (is the linked customer)
    const isLinkedCustomer =
      !!currentUserId &&
      !!project.customer?.userId &&
      project.customer.userId === currentUserId;

    const canApprove = isLinkedCustomer;

    // Determine if current user can comment (linked customer OR org admin/PM)
    let canComment = isLinkedCustomer;
    if (!canComment && currentUserId) {
      const membership = await this.prisma.organizationMember.findFirst({
        where: {
          userId: currentUserId,
          orgId: project.orgId,
          role: { in: ['OWNER', 'ADMIN', 'PROJECT_MANAGER'] },
        },
      });
      canComment = !!membership;
    }

    // Map media to DTO
    const media: MediaDto[] = project.media.map((m) => ({
      id: m.id,
      key: m.key,
      cdnUrl: m.cdnUrl,
      filename: m.filename,
      size: m.size,
      type: m.type,
      createdAt: m.createdAt,
    }));

    // Map comments to DTO
    const comments: CommentDto[] = project.messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      timestamp: msg.timestamp,
      user: {
        id: msg.user.id,
        name: msg.user.name,
      },
    }));

    return {
      project: {
        id: project.id,
        addressLine1: project.addressLine1,
        city: project.city,
        region: project.region,
        scheduledTime: project.scheduledTime,
        status: project.status,
        clientApprovalStatus: project.clientApprovalStatus,
        clientApprovedAt: project.clientApprovedAt,
        deliveryEnabledAt: project.deliveryEnabledAt,
      },
      organization: {
        id: project.organization.id,
        name: project.organization.name,
        logoUrl: project.organization.logoUrl,
        primaryEmail: project.organization.primaryEmail,
        phone: project.organization.phone,
      },
      media,
      comments,
      customer: project.customer
        ? {
            id: project.customer.id,
            name: project.customer.name,
            email: project.customer.email,
          }
        : undefined,
      canApprove,
      canComment,
      downloadEnabled: this.storageConfigured,
    };
  }

  /**
   * Get comments for a delivery by token.
   * Public access - token grants read access.
   */
  async getComments(token: string): Promise<CommentDto[]> {
    const project = await this.prisma.project.findUnique({
      where: { deliveryToken: token },
      include: {
        messages: {
          where: { channel: ProjectChatChannel.CUSTOMER },
          include: { user: true },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Delivery not found or invalid token');
    }

    if (!project.deliveryEnabledAt) {
      throw new NotFoundException('Delivery is not enabled for this project');
    }

    return project.messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      timestamp: msg.timestamp,
      user: {
        id: msg.user.id,
        name: msg.user.name,
      },
    }));
  }

  /**
   * Get project by delivery token (internal helper).
   */
  async getProjectByToken(token: string) {
    const project = await this.prisma.project.findUnique({
      where: { deliveryToken: token },
      include: {
        customer: true,
        organization: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Delivery not found or invalid token');
    }

    if (!project.deliveryEnabledAt) {
      throw new NotFoundException('Delivery is not enabled for this project');
    }

    return project;
  }

  /**
   * Approve a delivery.
   * Requires authenticated user to be the linked customer.
   */
  async approveDelivery(token: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { deliveryToken: token },
      include: {
        customer: true,
        organization: {
          include: {
            members: {
              where: { role: { in: ['OWNER', 'ADMIN', 'PROJECT_MANAGER'] } },
              include: { user: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Delivery not found or invalid token');
    }

    // Get approver's name
    const approver = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const updated = await this.prisma.project.update({
      where: { id: project.id },
      data: {
        clientApprovalStatus: ClientApprovalStatus.APPROVED,
        clientApprovedAt: new Date(),
        clientApprovedById: userId,
      },
    });

    const customerName = approver?.name || project.customer?.name || 'Customer';
    const projectAddress = this.buildProjectAddress(project);

    // Create approval notifications for ops team
    try {
      await this.notifications.createApprovalNotifications(
        project.id,
        project.orgId,
        userId,
        customerName,
      );
    } catch (error: any) {
      this.logger.warn(`Failed to create approval notifications: ${error.message}`);
    }

    // Send email notifications to ops team (PM, OWNER, ADMIN)
    // Fire-and-forget: don't await, don't fail the request
    for (const member of project.organization.members) {
      if (member.user?.email && member.userId !== userId) {
        this.emailService.sendApprovalNotificationEmail(
          member.user.email,
          member.user.name,
          project.organization.name,
          projectAddress,
          'APPROVED',
          customerName,
        ).then((sent) => {
          if (sent) {
            this.logger.log(`Approval email sent to ${member.user!.email} for project ${project.id}`);
          }
        }).catch((emailError) => {
          this.logger.error(`Failed to send approval email to ${member.user!.email}:`, emailError);
        });
      }
    }

    return {
      success: true,
      clientApprovalStatus: updated.clientApprovalStatus,
      clientApprovedAt: updated.clientApprovedAt,
    };
  }

  /**
   * Request changes on a delivery.
   * Requires authenticated user to be the linked customer.
   * Creates a message in the CUSTOMER channel with the feedback.
   */
  async requestChanges(token: string, userId: string, feedback: string) {
    const project = await this.prisma.project.findUnique({
      where: { deliveryToken: token },
      include: {
        customer: true,
        organization: {
          include: {
            members: {
              where: { role: { in: ['OWNER', 'ADMIN', 'PROJECT_MANAGER'] } },
              include: { user: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Delivery not found or invalid token');
    }

    // Update approval status
    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        clientApprovalStatus: ClientApprovalStatus.CHANGES_REQUESTED,
        clientApprovedAt: null,
        clientApprovedById: null,
      },
    });

    // Create a message with the feedback
    const message = await this.prisma.message.create({
      data: {
        projectId: project.id,
        userId,
        content: feedback,
        channel: ProjectChatChannel.CUSTOMER,
      },
      include: { user: true },
    });

    const customerName = message.user.name;
    const projectAddress = this.buildProjectAddress(project);

    // Create notifications for CHANGES_REQUESTED
    try {
      await this.notifications.createChangesRequestedNotifications(
        project.id,
        project.orgId,
        userId,
        customerName,
        feedback,
      );
    } catch (error: any) {
      this.logger.warn(`Failed to create changes requested notifications: ${error.message}`);
    }

    // Send email notifications to ops team (PM, OWNER, ADMIN)
    // Fire-and-forget: don't await, don't fail the request
    for (const member of project.organization.members) {
      if (member.user?.email && member.userId !== userId) {
        this.emailService.sendApprovalNotificationEmail(
          member.user.email,
          member.user.name,
          project.organization.name,
          projectAddress,
          'CHANGES_REQUESTED',
          customerName,
          feedback,
        ).then((sent) => {
          if (sent) {
            this.logger.log(`Changes requested email sent to ${member.user!.email} for project ${project.id}`);
          }
        }).catch((emailError) => {
          this.logger.error(`Failed to send changes requested email to ${member.user!.email}:`, emailError);
        });
      }
    }

    return {
      success: true,
      clientApprovalStatus: ClientApprovalStatus.CHANGES_REQUESTED,
      message: {
        id: message.id,
        content: message.content,
        timestamp: message.timestamp,
        user: {
          id: message.user.id,
          name: message.user.name,
        },
      },
    };
  }

  /**
   * Add a comment to a delivery.
   * Requires authenticated user to be the linked customer.
   */
  async addComment(token: string, userId: string, content: string): Promise<CommentDto> {
    const project = await this.prisma.project.findUnique({
      where: { deliveryToken: token },
      include: { customer: true },
    });

    if (!project) {
      throw new NotFoundException('Delivery not found or invalid token');
    }

    const message = await this.prisma.message.create({
      data: {
        projectId: project.id,
        userId,
        content,
        channel: ProjectChatChannel.CUSTOMER,
      },
      include: { user: true },
    });

    // Create notifications for delivery comment
    try {
      // Determine if comment is from customer or ops team
      const isFromCustomer = project.customer?.userId === userId;
      await this.notifications.createDeliveryCommentNotifications(
        project.id,
        project.orgId,
        userId,
        message.user.name,
        content,
        isFromCustomer,
      );
    } catch (error: any) {
      this.logger.warn(`Failed to create delivery comment notifications: ${error.message}`);
    }

    return {
      id: message.id,
      content: message.content,
      timestamp: message.timestamp,
      user: {
        id: message.user.id,
        name: message.user.name,
      },
    };
  }

  // =============================
  // Download Artifact Management
  // =============================

  private computeMediaHash(mediaIds: string[]): string {
    const sorted = [...mediaIds].sort();
    return crypto.createHash('md5').update(sorted.join(',')).digest('hex');
  }

  private getArtifactType(mediaTypes?: MediaType[]): DownloadArtifactType {
    if (!mediaTypes || mediaTypes.length === 0) {
      return DownloadArtifactType.ALL_MEDIA;
    }
    const hasPhoto = mediaTypes.includes(MediaType.PHOTO);
    const hasVideo = mediaTypes.includes(MediaType.VIDEO);
    if (hasPhoto && !hasVideo) return DownloadArtifactType.PHOTOS_ONLY;
    if (hasVideo && !hasPhoto) return DownloadArtifactType.VIDEOS_ONLY;
    return DownloadArtifactType.ALL_MEDIA;
  }

  /**
   * Request a download artifact for a delivery.
   * Returns the artifact status and URL if ready.
   * Triggers generation if no recent artifact exists.
   */
  async requestDownloadArtifact(
    token: string,
    mediaTypes?: MediaType[],
  ): Promise<{
    status: DownloadArtifactStatus;
    artifactId: string;
    cdnUrl?: string;
    filename?: string;
    error?: string;
  }> {
    // Fail fast if storage is not configured
    if (!this.storageConfigured) {
      throw new NotFoundException(
        'Download feature is not available. Storage provider not configured.',
      );
    }

    const project = await this.prisma.project.findUnique({
      where: { deliveryToken: token },
      include: {
        media: {
          orderBy: { createdAt: 'desc' },
        },
        organization: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Delivery not found or invalid token');
    }

    if (!project.deliveryEnabledAt) {
      throw new NotFoundException('Delivery is not enabled for this project');
    }

    let media = project.media;
    if (mediaTypes && mediaTypes.length > 0) {
      media = media.filter((m) => mediaTypes.includes(m.type));
    }

    if (media.length === 0) {
      throw new NotFoundException('No media available for download');
    }

    const mediaHash = this.computeMediaHash(media.map((m) => m.id));
    const artifactType = this.getArtifactType(mediaTypes);

    // Check for existing valid artifact (created within last hour, same hash)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingArtifact = await this.prisma.downloadArtifact.findFirst({
      where: {
        projectId: project.id,
        type: artifactType,
        mediaHash,
        status: DownloadArtifactStatus.READY,
        createdAt: { gte: oneHourAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingArtifact) {
      return {
        status: existingArtifact.status,
        artifactId: existingArtifact.id,
        cdnUrl: existingArtifact.cdnUrl || undefined,
        filename: existingArtifact.filename || undefined,
      };
    }

    // Check for in-progress artifact
    const pendingArtifact = await this.prisma.downloadArtifact.findFirst({
      where: {
        projectId: project.id,
        type: artifactType,
        mediaHash,
        status: { in: [DownloadArtifactStatus.PENDING, DownloadArtifactStatus.GENERATING] },
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }, // 10 min timeout
      },
      orderBy: { createdAt: 'desc' },
    });

    if (pendingArtifact) {
      return {
        status: pendingArtifact.status,
        artifactId: pendingArtifact.id,
      };
    }

    // Create new artifact in PENDING status
    // The ArtifactWorkerService will pick it up and process it
    const artifact = await this.prisma.downloadArtifact.create({
      data: {
        projectId: project.id,
        type: artifactType,
        status: DownloadArtifactStatus.PENDING,
        mediaHash,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hour expiry
      },
    });

    this.logger.log(`Created artifact ${artifact.id} for project ${project.id} (pending worker pickup)`);

    return {
      status: artifact.status,
      artifactId: artifact.id,
    };
  }

  /**
   * Get the status of a download artifact.
   */
  async getDownloadArtifactStatus(
    token: string,
    artifactId: string,
  ): Promise<{
    status: DownloadArtifactStatus;
    cdnUrl?: string;
    filename?: string;
    error?: string;
  }> {
    const project = await this.getProjectByToken(token);

    const artifact = await this.prisma.downloadArtifact.findFirst({
      where: {
        id: artifactId,
        projectId: project.id,
      },
    });

    if (!artifact) {
      throw new NotFoundException('Download artifact not found');
    }

    return {
      status: artifact.status,
      cdnUrl: artifact.cdnUrl || undefined,
      filename: artifact.filename || undefined,
      error: artifact.error || undefined,
    };
  }

  /**
   * Build a project address string from project fields.
   */
  private buildProjectAddress(project: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
  }): string {
    const parts = [
      project.addressLine1,
      project.addressLine2,
      project.city,
      project.region,
      project.postalCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Project';
  }
}
