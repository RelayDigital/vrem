import { Injectable, Logger, NotFoundException, StreamableFile } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectChatChannel, MediaType, ClientApprovalStatus, DownloadArtifactStatus, DownloadArtifactType } from '@prisma/client';
import { DeliveryResponseDto, MediaDto, CommentDto } from './dto/delivery-response.dto';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import * as crypto from 'crypto';
import axios from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  // Configuration for zip generation
  private readonly ZIP_CONCURRENCY_LIMIT = 5; // Max concurrent file downloads
  private readonly FILE_DOWNLOAD_TIMEOUT_MS = 30000; // 30 seconds per file

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Fetch a file with timeout.
   */
  private async fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Process items with limited concurrency.
   */
  private async processWithConcurrency<T, R>(
    items: T[],
    limit: number,
    processor: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
      const promise = processor(item).then((result) => {
        results.push(result);
      });

      const e = promise.then(() => {
        executing.splice(executing.indexOf(e), 1);
      });
      executing.push(e);

      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
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

    if (!project.deliveryEnabledAt) {
      throw new NotFoundException('Delivery is not enabled for this project');
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

    if (!project.deliveryEnabledAt) {
      throw new NotFoundException('Delivery is not enabled for this project');
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
        if (response.ok) {
          // Convert to Buffer (fetch returns Web ReadableStream, archiver needs Node.js stream/Buffer)
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          // Use a sanitized filename
          const safeFilename = m.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
          archive.append(buffer, { name: safeFilename });
        }
      } catch (error) {
        console.error(`Failed to fetch media ${m.id}:`, error);
        // Continue with other files
      }
    }

    archive.finalize();

    // Generate filename using address as primary name
    const addressParts = [project.addressLine1, project.city, project.region].filter(Boolean);
    const address = addressParts.length > 0
      ? addressParts.join('_').replace(/[^a-zA-Z0-9_-]/g, '_')
      : project.id;
    const filename = `${address}.zip`;

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

    // Create notifications for CHANGES_REQUESTED
    try {
      await this.notifications.createChangesRequestedNotifications(
        project.id,
        project.orgId,
        userId,
        message.user.name,
        feedback,
      );
    } catch (error: any) {
      this.logger.warn(`Failed to create changes requested notifications: ${error.message}`);
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

    // Create new artifact and start generation
    const artifact = await this.prisma.downloadArtifact.create({
      data: {
        projectId: project.id,
        type: artifactType,
        status: DownloadArtifactStatus.PENDING,
        mediaHash,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hour expiry
      },
    });

    // Start generation asynchronously (don't await)
    this.generateZipArtifact(artifact.id, project, media).catch((error) => {
      this.logger.error(`Failed to generate zip artifact ${artifact.id}:`, error);
    });

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
   * Generate zip artifact and upload to storage.
   * This runs asynchronously with limited concurrency and per-file timeout.
   */
  private async generateZipArtifact(
    artifactId: string,
    project: {
      id: string;
      addressLine1: string | null;
      city: string | null;
      organization: { name: string };
    },
    media: { id: string; key: string; cdnUrl: string | null; filename: string }[],
  ): Promise<void> {
    const tempDir = os.tmpdir();
    const tempZipPath = path.join(tempDir, `${artifactId}.zip`);

    try {
      // Update status to GENERATING
      await this.prisma.downloadArtifact.update({
        where: { id: artifactId },
        data: { status: DownloadArtifactStatus.GENERATING },
      });

      // Download files with limited concurrency and timeout
      type DownloadResult = { filename: string; buffer: Buffer } | null;

      const downloadResults = await this.processWithConcurrency<
        typeof media[number],
        DownloadResult
      >(
        media,
        this.ZIP_CONCURRENCY_LIMIT,
        async (m): Promise<DownloadResult> => {
          const url = m.cdnUrl || `https://ucarecdn.com/${m.key}/`;
          try {
            const response = await this.fetchWithTimeout(url, this.FILE_DOWNLOAD_TIMEOUT_MS);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const safeFilename = m.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
              return { filename: safeFilename, buffer };
            } else {
              this.logger.warn(`Failed to fetch media ${m.id}: HTTP ${response.status}`);
              return null;
            }
          } catch (error: any) {
            if (error.name === 'AbortError') {
              this.logger.warn(`Timeout fetching media ${m.id} after ${this.FILE_DOWNLOAD_TIMEOUT_MS}ms`);
            } else {
              this.logger.warn(`Failed to fetch media ${m.id}:`, error.message);
            }
            return null;
          }
        },
      );

      // Filter successful downloads
      const successfulDownloads = downloadResults.filter((r): r is NonNullable<typeof r> => r !== null);

      if (successfulDownloads.length === 0) {
        throw new Error('No media files could be downloaded');
      }

      this.logger.log(
        `Downloaded ${successfulDownloads.length}/${media.length} files for artifact ${artifactId}`,
      );

      // Create zip archive from downloaded buffers
      const archive = archiver('zip', { zlib: { level: 5 } });
      const output = fs.createWriteStream(tempZipPath);

      await new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
        archive.on('error', reject);

        archive.pipe(output);

        // Add all downloaded files to archive
        for (const { filename, buffer } of successfulDownloads) {
          archive.append(buffer, { name: filename });
        }

        archive.finalize();
      });

      // Get file size
      const stats = fs.statSync(tempZipPath);
      const fileSize = stats.size;

      // Generate filename using address as primary name
      const addressParts = [project.addressLine1, project.city, project.organization.name].filter(Boolean);
      const address = addressParts.length > 0
        ? addressParts.join('_').replace(/[^a-zA-Z0-9_-]/g, '_')
        : project.id;
      const filename = `${address}.zip`;

      // Upload to Uploadcare if configured
      let cdnUrl: string | undefined;
      let storageKey: string | undefined;

      const publicKey = process.env.UPLOADCARE_PUBLIC_KEY;
      const privateKey = process.env.UPLOADCARE_PRIVATE_KEY;

      if (publicKey && privateKey) {
        try {
          const fileData = fs.readFileSync(tempZipPath);
          const formData = new FormData();
          formData.append('UPLOADCARE_PUB_KEY', publicKey);
          formData.append('UPLOADCARE_STORE', '1');
          formData.append('file', new Blob([fileData]), filename);

          const uploadResponse = await fetch('https://upload.uploadcare.com/base/', {
            method: 'POST',
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            storageKey = uploadResult.file;
            cdnUrl = `https://ucarecdn.com/${storageKey}/${encodeURIComponent(filename)}`;
          } else {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
          }
        } catch (uploadError: any) {
          this.logger.error(`Failed to upload zip to Uploadcare:`, uploadError);
          throw uploadError;
        }
      } else {
        // Fallback: Use the temp file URL (not recommended for production)
        this.logger.warn('Uploadcare not configured, zip download will use streaming fallback');
        throw new Error('Storage provider not configured');
      }

      // Update artifact with success
      await this.prisma.downloadArtifact.update({
        where: { id: artifactId },
        data: {
          status: DownloadArtifactStatus.READY,
          key: storageKey,
          cdnUrl,
          filename,
          size: fileSize,
        },
      });
    } catch (error: any) {
      // Update artifact with error
      await this.prisma.downloadArtifact.update({
        where: { id: artifactId },
        data: {
          status: DownloadArtifactStatus.FAILED,
          error: error.message || 'Unknown error',
        },
      });
      throw error;
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(tempZipPath)) {
          fs.unlinkSync(tempZipPath);
        }
      } catch (cleanupError) {
        this.logger.warn(`Failed to clean up temp file ${tempZipPath}:`, cleanupError);
      }
    }
  }
}
