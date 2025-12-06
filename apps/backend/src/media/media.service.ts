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

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private prisma: PrismaService) {}

  private async ensureProjectAccess(projectId: string, orgId?: string) {
    const where: Record<string, any> = { id: projectId };
    if (orgId) {
      where.orgId = orgId;
    }

    const project = await this.prisma.project.findFirst({ where });
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

  async confirmUpload(dto: ConfirmUploadDto) {
    return this.createMediaForProject(
      {
        projectId: dto.projectId,
        key: dto.key,
        filename: dto.filename,
        size: dto.size,
        type: dto.type,
        cdnUrl: dto.cdnUrl,
      },
      undefined,
    );
  }

  async createMediaForProject(
    input: CreateProjectMediaDto & { projectId: string },
    orgId?: string,
  ) {
    await this.ensureProjectAccess(input.projectId, orgId);
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

  async getMediaForProject(projectId: string, orgId?: string) {
    await this.ensureProjectAccess(projectId, orgId);
    return this.prisma.media.findMany({
      where: { projectId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMediaById(id: string, orgId?: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) throw new NotFoundException('Media not found');

    if (orgId) {
      await this.ensureProjectAccess(media.projectId, orgId);
    }

    return media;
  }

  async deleteMedia(id: string, projectId?: string, orgId?: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) throw new NotFoundException('Media not found');

    if (projectId && media.projectId !== projectId) {
      throw new ForbiddenException('Media does not belong to this project');
    }

    if (orgId) {
      await this.ensureProjectAccess(media.projectId, orgId);
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
