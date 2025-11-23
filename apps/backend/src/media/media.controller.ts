import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { MediaService } from './media.service';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('confirm-upload')
  confirmUpload(@Body() dto: ConfirmUploadDto) {
    return this.mediaService.confirmUpload(dto);
  }

  @Get('project/:projectId')
  getMediaForProject(@Param('projectId') projectId: string) {
    return this.mediaService.getMediaForProject(projectId);
  }

  @Get(':id')
  getMediaById(@Param('id') id: string) {
    return this.mediaService.getMediaById(id);
  }

  @Delete(':id')
  deleteMedia(@Param('id') id: string) {
    return this.mediaService.deleteMedia(id);
  }
}
