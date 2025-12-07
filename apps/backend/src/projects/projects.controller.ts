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

@Controller('projects')
@UseGuards(JwtAuthGuard, OrgContextGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly mediaService: MediaService,
  ) {}

  // GET all projects in this organization
  @Get()
  getProjects(@Req() req) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.findForOrg(ctx);
  }

  // MEDIA: list all media for a project scoped to org
  @Get(':projectId/media')
  getProjectMedia(@Param('projectId') projectId: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.mediaService.getMediaForProject(projectId, ctx, user);
  }

  // MEDIA: create media entry for a project
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
  @Get('mine')
  findMine(@Req() req: any, @CurrentUser() user: AuthenticatedUser) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.findForUser(ctx, user);
  }

  // GET messages for a project
  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user,
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
  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user,
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
  @Post('create')
  createProject(@Req() req, @Body() dto: CreateProjectDto) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.create(ctx, dto);
  }

  // GET one project scoped to org
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req, @CurrentUser() user) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.findOneForUser(id, ctx, user);
  }

  // ASSIGN tech + editor
  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignProjectDto,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.assign(id, dto, ctx);
  }

  // UPDATE project
  @Patch(':id')
  updateProject(@Param('id') id: string, @Body() dto: UpdateProjectDto, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.update(id, dto, ctx);
  }

  // REMOVE
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.remove(id, ctx);
  }

  // ASSIGN TECHNICIAN
  @Patch(':id/assign-technician')
  assignTechnician(
    @Param('id') id: string,
    @Body('technicianId') technicianId: string,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.assignTechnician(id, technicianId, ctx);
  }

  // ASSIGN CUSTOMER
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
  @Patch(':id/assign-project-manager')
  assignProjectManager(
    @Param('id') id: string,
    @Body('projectManagerId') projectManagerId: string,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.assignProjectManager(id, projectManagerId, ctx);
  }

  // ASSIGN EDITOR
  @Patch(':id/assign-editor')
  assignEditor(
    @Param('id') id: string,
    @Body('editorId') editorId: string,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.assignEditor(id, editorId, ctx);
  }

  // SCHEDULE
  @Patch(':id/schedule')
  scheduleProject(
    @Param('id') id: string,
    @Body('scheduledTime') scheduledTime: string,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.scheduleProject(id, new Date(scheduledTime), ctx);
  }

  // STATUS UPDATES
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body() dto: UpdateProjectStatusDto,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.projectsService.updateStatus(id, dto.status, ctx, user);
  }
}
