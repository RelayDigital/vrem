import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Body,
  Patch,
  Req,
  Post,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';
import { ProjectChatChannel } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { CreateProjectMediaDto } from '../media/dto/create-project-media.dto';
import { MediaService } from '../media/media.service';
import type { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { ApiOrgScoped } from '../common/decorators/api-org-scoped.decorator';

@ApiTags('Projects')
@ApiOrgScoped()
@Controller('projects')
@UseGuards(JwtAuthGuard, OrgContextGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly mediaService: MediaService,
  ) {}

  // GET all projects in this organization
  @ApiOperation({ summary: 'List all projects in organization' })
  @Get()
  getProjects(@Req() req) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.findForOrg(ctx);
  }

  // MEDIA: list all media for a project scoped to org
  @ApiOperation({ summary: 'List media for a project' })
  @Get(':projectId/media')
  getProjectMedia(@Param('projectId') projectId: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.mediaService.getMediaForProject(projectId, ctx, user);
  }

  // MEDIA: create media entry for a project
  @ApiOperation({ summary: 'Add media to a project' })
  @Post(':projectId/media')
  addProjectMedia(
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectMediaDto,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.mediaService.createMediaForProject(
      { ...dto, projectId },
      ctx,
      user,
    );
  }

  // MEDIA: delete media entry from a project
  @ApiOperation({ summary: 'Delete media from a project' })
  @Delete(':projectId/media/:mediaId')
  deleteProjectMedia(
    @Param('projectId') projectId: string,
    @Param('mediaId') mediaId: string,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.mediaService.deleteMedia(mediaId, projectId, ctx, user);
  }

  // GET only user's projects for this org
  @ApiOperation({ summary: 'List current user projects' })
  @Get('mine')
  findMine(@Req() req: any, @CurrentUser() user: AuthenticatedUser) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.findForUser(ctx, user);
  }

  // GET messages for a project
  @ApiOperation({ summary: 'Get messages for a project' })
  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req,
    @Query('channel') channel?: ProjectChatChannel,
  ) {
    const ctx = req.orgContext as OrgContext;
    const requested =
      typeof channel === 'string'
        ? (channel as string).toUpperCase()
        : channel;
    const effectiveChannel =
      requested === ProjectChatChannel.CUSTOMER
        ? ProjectChatChannel.CUSTOMER
        : ProjectChatChannel.TEAM;
    return this.projectsService.getMessages(id, ctx, user, effectiveChannel);
  }

  // POST message
  @ApiOperation({ summary: 'Add a message to a project' })
  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    const normalizedChannel =
      typeof dto.channel === 'string'
        ? (dto.channel as string).toUpperCase()
        : dto.channel;
    const effectiveDto = {
      ...dto,
      channel:
        normalizedChannel === ProjectChatChannel.CUSTOMER
          ? ProjectChatChannel.CUSTOMER
          : ProjectChatChannel.TEAM,
    };
    return this.projectsService.addMessage(id, effectiveDto, ctx, user);
  }

  // CREATE project
  @ApiOperation({ summary: 'Create a new project' })
  @Post('create')
  createProject(@Req() req, @Body() dto: CreateProjectDto) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.create(ctx, dto);
  }

  // GET one project scoped to org
  @ApiOperation({ summary: 'Get project by ID' })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req, @CurrentUser() user: AuthenticatedUser) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.findOneForUser(id, ctx, user);
  }

  // ASSIGN tech + editor
  @ApiOperation({ summary: 'Assign technician and editor to a project' })
  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignProjectDto,
    @Req() req,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.assign(id, dto, ctx, user);
  }

  // UPDATE project
  @ApiOperation({ summary: 'Update a project' })
  @Patch(':id')
  updateProject(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.update(id, dto, ctx, user);
  }

  // REMOVE
  @ApiOperation({ summary: 'Delete a project' })
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.remove(id, ctx);
  }

  // ASSIGN TECHNICIAN
  @ApiOperation({ summary: 'Assign technician to a project' })
  @Patch(':id/assign-technician')
  assignTechnician(
    @Param('id') id: string,
    @Body('technicianId') technicianId: string,
    @Req() req,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.assignTechnician(id, technicianId, ctx, user);
  }

  // ASSIGN CUSTOMER - Note: Only OWNER/ADMIN can change customer (not PM)
  @ApiOperation({ summary: 'Assign customer to a project' })
  @Patch(':id/assign-customer')
  assignCustomer(
    @Param('id') id: string,
    @Body('customerId') customerId: string,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.assignCustomer(id, customerId, ctx);
  }

  // ASSIGN PROJECT MANAGER
  @ApiOperation({ summary: 'Assign project manager' })
  @Patch(':id/assign-project-manager')
  assignProjectManager(
    @Param('id') id: string,
    @Body('projectManagerId') projectManagerId: string,
    @Req() req,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.assignProjectManager(id, projectManagerId, ctx, user);
  }

  // ASSIGN EDITOR
  @ApiOperation({ summary: 'Assign editor to a project' })
  @Patch(':id/assign-editor')
  assignEditor(
    @Param('id') id: string,
    @Body('editorId') editorId: string,
    @Req() req,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.assignEditor(id, editorId, ctx, user);
  }

  // SCHEDULE
  @ApiOperation({ summary: 'Schedule a project' })
  @Patch(':id/schedule')
  scheduleProject(
    @Param('id') id: string,
    @Body('scheduledTime') scheduledTime: string,
    @Req() req,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.scheduleProject(id, new Date(scheduledTime), ctx, user);
  }

  // STATUS UPDATES
  @ApiOperation({ summary: 'Update project status' })
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProjectStatusDto,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.updateStatus(id, dto.status, ctx, user);
  }

  // DELIVERY MANAGEMENT

  // GET delivery status for a project
  @ApiOperation({ summary: 'Get delivery status for a project' })
  @Get(':id/delivery')
  getDeliveryStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.getDeliveryStatus(id, ctx, user);
  }

  // ENABLE delivery for a project
  @ApiOperation({ summary: 'Enable delivery for a project' })
  @Post(':id/delivery/enable')
  enableDelivery(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.enableDelivery(id, ctx, user);
  }

  // DISABLE delivery for a project
  @ApiOperation({ summary: 'Disable delivery for a project' })
  @Post(':id/delivery/disable')
  disableDelivery(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.disableDelivery(id, ctx, user);
  }

  // REGENERATE delivery token for a project
  @ApiOperation({ summary: 'Regenerate delivery token' })
  @Post(':id/delivery/regenerate-token')
  regenerateDeliveryToken(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.regenerateDeliveryToken(id, ctx, user);
  }

  // ROTATE delivery token for a project (alias for regenerate-token)
  @ApiOperation({ summary: 'Rotate delivery token' })
  @Post(':id/delivery/rotate-token')
  rotateDeliveryToken(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.regenerateDeliveryToken(id, ctx, user);
  }
}
