import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { buildCdnUrl } from './utils/cdn.util';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class MediaService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  constructor(private prisma: PrismaService) {}

  async confirmUpload(dto: ConfirmUploadDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) throw new NotFoundException('Project not found');

    const cdnUrl = buildCdnUrl(dto.key);

    return this.prisma.media.create({
      data: {
        projectId: dto.projectId,
        key: dto.key,
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
      orderBy: { createdAt: 'desc' }, // newest first
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

    // Delete file from Supabase bucket
    await this.supabase.storage
      .from('media')
      .remove([media.key]); // key = "projects/123/photo01.jpg"

    // Delete media record from DB
    return this.prisma.media.delete({
      where: { id },
    });
  }
}
