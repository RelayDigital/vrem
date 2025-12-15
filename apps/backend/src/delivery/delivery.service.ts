import { Injectable, Logger, NotFoundException, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectChatChannel, MediaType, ClientApprovalStatus } from '@prisma/client';
import { DeliveryResponseDto, MediaDto, CommentDto } from './dto/delivery-response.dto';
import archiver from 'archiver';
import { PassThrough } from 'stream';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

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

    // Determine if current user can approve (is the linked customer)
    const canApprove =
      !!currentUserId &&
      !!project.customer?.userId &&
      project.customer.userId === currentUserId;

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

    return project;
  }

  /**
   * Get media items for download.
   * Returns media with CDN URLs for streaming.
   */
  async getMediaForDownload(
    token: string,
    mediaTypes?: MediaType[],
  ): Promise<{ filename: string; cdnUrl: string }[]> {
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

    let media = project.media;

    // Filter by media types if specified
    if (mediaTypes && mediaTypes.length > 0) {
      media = media.filter((m) => mediaTypes.includes(m.type));
    }

    // Build download URLs
    return media.map((m) => ({
      filename: m.filename,
      cdnUrl: m.cdnUrl || `https://ucarecdn.com/${m.key}/`,
    }));
  }

  /**
   * Create a zip archive stream of all media.
   * Returns a StreamableFile that can be sent as response.
   */
  async createDownloadStream(
    token: string,
    mediaTypes?: MediaType[],
  ): Promise<{ stream: PassThrough; filename: string }> {
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

    let media = project.media;

    // Filter by media types if specified
    if (mediaTypes && mediaTypes.length > 0) {
      media = media.filter((m) => mediaTypes.includes(m.type));
    }

    // Create zip archive
    const archive = archiver('zip', {
      zlib: { level: 5 }, // Moderate compression for speed
    });

    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    // Add each media file to the archive
    for (const m of media) {
      const url = m.cdnUrl || `https://ucarecdn.com/${m.key}/`;
      try {
        const response = await fetch(url);
        if (response.ok && response.body) {
          // Use a sanitized filename
          const safeFilename = m.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
          archive.append(response.body as any, { name: safeFilename });
        }
      } catch (error) {
        console.error(`Failed to fetch media ${m.id}:`, error);
        // Continue with other files
      }
    }

    archive.finalize();

    // Generate filename
    const address = [project.addressLine1, project.city].filter(Boolean).join('_').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${project.organization.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${address || project.id}.zip`;

    return { stream: passThrough, filename };
  }

  /**
   * Approve a delivery.
   * Requires authenticated user to be the linked customer.
   */
  async approveDelivery(token: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { deliveryToken: token },
      include: { customer: true },
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

    // Create approval notifications for ops team
    try {
      await this.notifications.createApprovalNotifications(
        project.id,
        project.orgId,
        userId,
        approver?.name || project.customer?.name || 'Customer',
      );
    } catch (error: any) {
      this.logger.warn(`Failed to create approval notifications: ${error.message}`);
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
}
