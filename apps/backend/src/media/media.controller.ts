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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';
import { ApiOrgScoped } from '../common/decorators/api-org-scoped.decorator';

@ApiTags('Media')
@ApiOrgScoped()
@Controller('media')
@UseGuards(JwtAuthGuard, OrgContextGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // @Public() // for testing
  @ApiOperation({ summary: 'Confirm a media upload' })
  @Post('confirm-upload')
  confirmUpload(@Body() dto: ConfirmUploadDto, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.mediaService.confirmUpload(dto, ctx, user);
  }

  // @Public() // for testing
  @ApiOperation({ summary: 'Get media for a project' })
  @Get('project/:projectId')
  getMediaForProject(@Param('projectId') projectId: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.mediaService.getMediaForProject(projectId, ctx, user);
  }

  // @Public() // for testing
  @ApiOperation({ summary: 'Get media by ID' })
  @Get(':id')
  getMediaById(@Param('id') id: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.mediaService.getMediaById(id, ctx, user);
  }

  // @Public() // for testing
  @ApiOperation({ summary: 'Delete media by ID' })
  @Delete(':id')
  deleteMedia(@Param('id') id: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.mediaService.deleteMedia(id, undefined, ctx, user);
  }
}
