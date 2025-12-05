import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { MediaService } from './media.service';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { Public } from '../auth/public.decorator';


@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // @Public() // for testing
  @Post('confirm-upload')
  confirmUpload(@Body() dto: ConfirmUploadDto) {
    return this.mediaService.confirmUpload(dto);
  }

  // @Public() // for testing
  @Get('project/:projectId')
  getMediaForProject(@Param('projectId') projectId: string) {
    return this.mediaService.getMediaForProject(projectId);
  }

  // @Public() // for testing
  @Get(':id')
  getMediaById(@Param('id') id: string) {
    return this.mediaService.getMediaById(id);
  }

  // @Public() // for testing
  @Delete(':id')
  deleteMedia(@Param('id') id: string) {
    return this.mediaService.deleteMedia(id);
  }
}
