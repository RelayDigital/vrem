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
  ForbiddenException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserAccountType, ProjectChatChannel } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { CurrentOrg } from '../organizations/current-org.decorator';
import { OrgMemberGuard } from '../organizations/org-member.guard';
import { MediaService } from '../media/media.service';
import { CreateProjectMediaDto } from '../media/dto/create-project-media.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly mediaService: MediaService,
  ) {}

  // GET all projects in this organization
  @Get()
  @UseGuards(OrgMemberGuard)
  @Roles(UserAccountType.COMPANY)
  getProjects(@CurrentOrg() org) {
    return this.projectsService.findForOrg(org.id);
  }

  // MEDIA: list all media for a project scoped to org
  @Get(':projectId/media')
  @UseGuards(OrgMemberGuard)
  @Roles(
    UserAccountType.AGENT,
    UserAccountType.PROVIDER,
    UserAccountType.COMPANY,
  )
  getProjectMedia(
    @Param('projectId') projectId: string,
    @CurrentOrg() org,
  ) {
    if (!org?.id) {
      throw new ForbiddenException('Organization ID is required to access project media');
    }
    return this.mediaService.getMediaForProject(projectId, org.id);
  }

  // MEDIA: create media entry for a project
  @Post(':projectId/media')
  @UseGuards(OrgMemberGuard)
  @Roles(
    UserAccountType.AGENT,
    UserAccountType.PROVIDER,
    UserAccountType.COMPANY,
  )
  addProjectMedia(
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectMediaDto,
    @CurrentOrg() org,
  ) {
    if (!org?.id) {
      throw new ForbiddenException('Organization ID is required to add media');
    }
    return this.mediaService.createMediaForProject(
      {
        ...dto,
        projectId,
      },
      org.id,
    );
  }

  // MEDIA: delete media entry from a project
  @Delete(':projectId/media/:mediaId')
  @UseGuards(OrgMemberGuard)
  @Roles(
    UserAccountType.AGENT,
    UserAccountType.PROVIDER,
    UserAccountType.COMPANY,
  )
  deleteProjectMedia(
    @Param('projectId') projectId: string,
    @Param('mediaId') mediaId: string,
    @CurrentOrg() org,
  ) {
    if (!org?.id) {
      throw new ForbiddenException('Organization ID is required to delete media');
    }
    return this.mediaService.deleteMedia(mediaId, projectId, org.id);
  }

  // GET only user's projects for this org
  @Get('mine')
  findMine(@CurrentUser() user, @CurrentOrg() org, @Req() req: any) {
    // For agents, org might be null if they're not org members
    // They can still access their projects by agentId
    const orgId = org?.id || null;
    const membershipRole = req?.membership?.role;
    const effectiveRole =
      membershipRole &&
      (membershipRole === 'ADMIN' || membershipRole === 'OWNER')
        ? UserAccountType.COMPANY
        : user.accountType;
    return this.projectsService.findForUser(user.id, effectiveRole, orgId);
  }

  // GET messages for a project
  @Get(':id/messages')
  @UseGuards(OrgMemberGuard)
  @Roles(UserAccountType.AGENT, UserAccountType.PROVIDER, UserAccountType.COMPANY, UserAccountType.COMPANY, UserAccountType.COMPANY)
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user,
    @CurrentOrg() org,
    @Req() req,
    @Query('channel') channel?: ProjectChatChannel,
  ) {
    const requested =
      typeof channel === 'string'
        ? (channel as string).toUpperCase()
        : channel;
    const effectiveChannel =
      requested === ProjectChatChannel.CUSTOMER
        ? ProjectChatChannel.CUSTOMER
        : ProjectChatChannel.TEAM;
    return this.projectsService.getMessages(
      id,
      user,
      org.id,
      req?.membership?.role,
      effectiveChannel,
    );
  }

  // POST message
  @Post(':id/messages')
  @UseGuards(OrgMemberGuard)
  @Roles(UserAccountType.AGENT, UserAccountType.PROVIDER, UserAccountType.COMPANY, UserAccountType.COMPANY, UserAccountType.COMPANY)
  addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user,
    @CurrentOrg() org,
    @Req() req,
  ) {
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
    return this.projectsService.addMessage(
      id,
      effectiveDto,
      user,
      org.id,
      req?.membership?.role,
    );
  }

  // CREATE project
  @Post('create')
  @UseGuards(OrgMemberGuard)
  @Roles(UserAccountType.AGENT, UserAccountType.COMPANY, UserAccountType.COMPANY)
  createProject(
    @CurrentUser() user,
    @CurrentOrg() org,
    @Body() dto: CreateProjectDto,
  ) {
    if (!org?.id) {
      throw new ForbiddenException('Organization ID is required to create a project');
    }
    return this.projectsService.create(dto, org.id);
  }

  // GET one project scoped to org
  @Get(':id')
  @UseGuards(OrgMemberGuard)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user,
    @CurrentOrg() org,
    @Req() req,
  ) {
    return this.projectsService.findOneForUser(
      id,
      user.id,
      user.accountType,
      org.id,
      req?.membership?.role,
    );
  }

  // ASSIGN tech + editor
  @Patch(':id/assign')
  @UseGuards(OrgMemberGuard)
  @Roles(UserAccountType.COMPANY, UserAccountType.COMPANY)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignProjectDto,
    @CurrentOrg() org,
  ) {
    return this.projectsService.assign(id, dto, org.id);
  }

  // UPDATE project
  @Patch(':id')
  @UseGuards(OrgMemberGuard)
  @Roles(UserAccountType.COMPANY, UserAccountType.COMPANY)
  updateProject(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentOrg() org,
  ) {
    return this.projectsService.update(id, dto, org.id);
  }

  // REMOVE
  @Delete(':id')
  @UseGuards(OrgMemberGuard)
  @Roles(UserAccountType.COMPANY, UserAccountType.COMPANY, UserAccountType.AGENT)
  remove(@Param('id') id: string, @CurrentOrg() org, @CurrentUser() user, @Req() req) {
    return this.projectsService.remove(id, org.id, user, req?.membership?.role);
  }

  // ASSIGN TECHNICIAN
  @Patch(':id/assign-technician')
  @UseGuards(OrgMemberGuard, RolesGuard)
  @Roles(UserAccountType.COMPANY)
  assignTechnician(
    @Param('id') id: string,
    @Body('technicianId') technicianId: string,
    @CurrentOrg() org,
    @Req() req,
  ) {
    const membershipRole = req?.membership?.role;
    const allowed = ['OWNER', 'ADMIN', 'PROJECT_MANAGER'];
    if (!allowed.includes(membershipRole)) {
      throw new ForbiddenException('You are not allowed to assign technicians for this organization');
    }
    return this.projectsService.assignTechnician(id, technicianId, org.id);
  }

  // ASSIGN CUSTOMER
  @Patch(':id/assign-customer')
  @UseGuards(OrgMemberGuard, RolesGuard)
  @Roles(UserAccountType.COMPANY)
  assignCustomer(
    @Param('id') id: string,
    @Body('customerId') customerId: string,
    @CurrentOrg() org,
    @Req() req,
  ) {
    const membershipRole = req?.membership?.role;
    const allowed = ['OWNER', 'ADMIN', 'PROJECT_MANAGER'];
    if (!allowed.includes(membershipRole)) {
      throw new ForbiddenException('You are not allowed to assign customers for this organization');
    }
    return this.projectsService.assignCustomer(id, customerId, org.id);
  }

  // ASSIGN PROJECT MANAGER
  @Patch(':id/assign-project-manager')
  @UseGuards(OrgMemberGuard, RolesGuard)
  @Roles(UserAccountType.COMPANY)
  assignProjectManager(
    @Param('id') id: string,
    @Body('projectManagerId') projectManagerId: string,
    @CurrentOrg() org,
    @Req() req,
  ) {
    const membershipRole = req?.membership?.role;
    const allowed = ['OWNER', 'ADMIN', 'PROJECT_MANAGER'];
    if (!allowed.includes(membershipRole)) {
      throw new ForbiddenException('You are not allowed to assign project managers for this organization');
    }
    return this.projectsService.assignProjectManager(id, projectManagerId, org.id);
  }

  // ASSIGN EDITOR
  @Patch(':id/assign-editor')
  @UseGuards(OrgMemberGuard, RolesGuard)
  @Roles(UserAccountType.COMPANY, UserAccountType.COMPANY)
  assignEditor(
    @Param('id') id: string,
    @Body('editorId') editorId: string,
    @CurrentOrg() org,
  ) {
    return this.projectsService.assignEditor(id, editorId, org.id);
  }

  // SCHEDULE
  @Patch(':id/schedule')
  @UseGuards(OrgMemberGuard, RolesGuard)
  @Roles(UserAccountType.COMPANY, UserAccountType.COMPANY)
  scheduleProject(
    @Param('id') id: string,
    @Body('scheduledTime') scheduledTime: string,
    @CurrentOrg() org,
  ) {
    return this.projectsService.scheduleProject(id, new Date(scheduledTime), org.id);
  }

  // STATUS UPDATES
  @Patch(':id/status')
  @UseGuards(OrgMemberGuard)
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body() dto: UpdateProjectStatusDto,
    @CurrentOrg() org,
  ) {
    return this.projectsService.updateStatus(id, dto.status, user, org.id);
  }
}
