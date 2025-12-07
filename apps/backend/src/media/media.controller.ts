import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';

@Controller('media')
@UseGuards(JwtAuthGuard, OrgContextGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // @Public() // for testing
  @Post('confirm-upload')
  confirmUpload(@Body() dto: ConfirmUploadDto, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.mediaService.confirmUpload(dto, ctx, user);
  }

  // @Public() // for testing
  @Get('project/:projectId')
  getMediaForProject(@Param('projectId') projectId: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.mediaService.getMediaForProject(projectId, ctx, user);
  }

  // @Public() // for testing
  @Get(':id')
  getMediaById(@Param('id') id: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.mediaService.getMediaById(id, ctx, user);
  }

  // @Public() // for testing
  @Delete(':id')
  deleteMedia(@Param('id') id: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.mediaService.deleteMedia(id, undefined, ctx, user);
  }
}
