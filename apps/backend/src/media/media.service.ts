import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { buildCdnUrl } from './utils/cdn.util';
import axios from 'axios';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async confirmUpload(dto: ConfirmUploadDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const cdnUrl = buildCdnUrl(dto.key);

    return this.prisma.media.create({
      data: {
        projectId: dto.projectId,
        key: dto.key, // Uploadcare UUID
        filename: dto.filename,
        size: dto.size,
        type: dto.type,
        cdnUrl,
      },
    });
  }

  async getMediaForProject(projectId: string) {
    return this.prisma.media.findMany({
      where: { projectId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMediaById(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) throw new NotFoundException('Media not found');

    return media;
  }

  async deleteMedia(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) throw new NotFoundException('Media not found');

    // Delete from Uploadcare using REST API
    await axios.delete(`https://api.uploadcare.com/files/${media.key}/`, {
      headers: {
        Authorization: `Uploadcare.Simple ${process.env.UPLOADCARE_PUBLIC_KEY}:${process.env.UPLOADCARE_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    // Delete metadata record
    return this.prisma.media.delete({
      where: { id },
    });
  }
}
