import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { buildCdnUrl } from './utils/cdn.util';
import axios from 'axios';
import { MediaType } from '@prisma/client';
import { CreateProjectMediaDto } from './dto/create-project-media.dto';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private prisma: PrismaService,
    private authorization: AuthorizationService,
  ) {}

  private async ensureProjectAccess(projectId: string, ctx: OrgContext) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId: ctx.org.id },
      include: {
        technician: true,
        editor: true,
      },
    });
    if (!project) {
      throw new ForbiddenException('Project does not belong to your organization');
    }

    return project;
  }

  private normalizeMediaType(type: string | MediaType): MediaType {
    const normalized = (typeof type === 'string' ? type.toUpperCase() : type) as MediaType;
    const allowed = Object.values(MediaType);
    if (!allowed.includes(normalized)) {
      throw new BadRequestException('Invalid media type');
    }
    return normalized;
  }

  async confirmUpload(
    dto: ConfirmUploadDto,
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    return this.createMediaForProject(
      {
        projectId: dto.projectId,
        key: dto.key,
        filename: dto.filename,
        size: dto.size,
        type: dto.type,
        cdnUrl: dto.cdnUrl,
      },
      ctx,
      user,
    );
  }

  async createMediaForProject(
    input: CreateProjectMediaDto & { projectId: string },
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    const project = await this.ensureProjectAccess(input.projectId, ctx);
    if (!this.authorization.canUploadMedia(ctx, project, user)) {
      throw new ForbiddenException('Not allowed to upload media for this project');
    }
    const cdnUrl =
      input.cdnUrl ||
      (process.env.UPLOADCARE_CDN_BASE ? buildCdnUrl(input.key) : undefined);
    const mediaType = this.normalizeMediaType(input.type);
    const size = Number(input.size);

    if (!Number.isFinite(size)) {
      throw new BadRequestException('size must be a number');
    }

    // Avoid duplicates by returning the existing record if the key already exists for this project
    const existing = await this.prisma.media.findFirst({
      where: { projectId: input.projectId, key: input.key },
    });
    if (existing) {
      return existing;
    }

    try {
      return await this.prisma.media.create({
        data: {
          projectId: input.projectId,
          key: input.key, // Uploadcare UUID or storage key
          filename: input.filename,
          size,
          type: mediaType,
          cdnUrl,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to create media for project ${input.projectId}: ${error?.message || error}`);
      throw new BadRequestException('Unable to save media record');
    }
  }

  async getMediaForProject(
    projectId: string,
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    const project = await this.ensureProjectAccess(projectId, ctx);
    if (!this.authorization.canViewProject(ctx, project)) {
      throw new ForbiddenException('Not allowed to view media for this project');
    }
    return this.prisma.media.findMany({
      where: { projectId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMediaById(id: string, ctx: OrgContext, user: AuthenticatedUser) {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) throw new NotFoundException('Media not found');

    const project = await this.ensureProjectAccess(media.projectId, ctx);
    if (!this.authorization.canViewProject(ctx, project)) {
      throw new ForbiddenException('Not allowed to view this media');
    }

    return media;
  }

  async deleteMedia(
    id: string,
    projectId: string | undefined,
    ctx: OrgContext,
    user: AuthenticatedUser,
  ) {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) throw new NotFoundException('Media not found');

    if (projectId && media.projectId !== projectId) {
      throw new ForbiddenException('Media does not belong to this project');
    }

    const project = await this.ensureProjectAccess(media.projectId, ctx);
    if (!this.authorization.canUploadMedia(ctx, project, user)) {
      throw new ForbiddenException('Not allowed to delete this media');
    }

    await this.deleteFromStorageIfConfigured(media.key);

    // Delete metadata record
    return this.prisma.media.delete({
      where: { id },
    });
  }

  private async deleteFromStorageIfConfigured(key: string) {
    if (!process.env.UPLOADCARE_PUBLIC_KEY || !process.env.UPLOADCARE_PRIVATE_KEY) {
      return;
    }

    try {
      await axios.delete(`https://api.uploadcare.com/files/${key}/`, {
        headers: {
          Authorization: `Uploadcare.Simple ${process.env.UPLOADCARE_PUBLIC_KEY}:${process.env.UPLOADCARE_PRIVATE_KEY}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error: any) {
      this.logger.warn(
        `Failed to delete media key ${key} from Uploadcare: ${error?.message || error}`,
      );
    }
  }
}
