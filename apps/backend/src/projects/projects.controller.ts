import {
  Controller,
  Get,
  Param,
  UseGuards,
  Body,
  Patch,
  Req,
  Post,
  Delete
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { CurrentOrg } from '../organizations/current-org.decorator';
import { OrgMemberGuard } from '../organizations/org-member.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // GET all projects in this organization
  @Get()
  @UseGuards(OrgMemberGuard)
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  getProjects(@CurrentOrg() org) {
    return this.projectsService.findForOrg(org.id);
  }

  // GET only user's projects for this org
  @Get('mine')
  @UseGuards(OrgMemberGuard)
  findMine(@CurrentUser() user, @CurrentOrg() org) {
    return this.projectsService.findForUser(user.id, user.role, org.id);
  }

  // GET messages for a project
  @Get(':id/messages')
  @UseGuards(OrgMemberGuard)
  @Roles(Role.AGENT, Role.TECHNICIAN, Role.EDITOR, Role.PROJECT_MANAGER, Role.ADMIN)
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user,
    @CurrentOrg() org
  ) {
    return this.projectsService.getMessages(id, user, org.id);
  }

  // POST message
  @Post(':id/messages')
  @UseGuards(OrgMemberGuard)
  @Roles(Role.AGENT, Role.TECHNICIAN, Role.EDITOR, Role.PROJECT_MANAGER, Role.ADMIN)
  addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user,
    @CurrentOrg() org,
  ) {
    return this.projectsService.addMessage(id, dto, user, org.id);
  }

  // CREATE project
  @Post('create')
  @UseGuards(OrgMemberGuard)
  @Roles(Role.AGENT, Role.PROJECT_MANAGER)
  createProject(
    @CurrentUser() user,
    @CurrentOrg() org,
    @Body() dto: CreateProjectDto,
  ) {
    if (user.role === Role.AGENT) {
      dto.agentId = user.id;
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
  ) {
    return this.projectsService.findOneForUser(id, user.id, user.role, org.id);
  }

  // ASSIGN tech + editor
  @Patch(':id/assign')
  @UseGuards(OrgMemberGuard)
  @Roles(Role.PROJECT_MANAGER, Role.ADMIN)
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
  @Roles(Role.PROJECT_MANAGER, Role.ADMIN)
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
  @Roles(Role.PROJECT_MANAGER, Role.ADMIN)
  remove(@Param('id') id: string, @CurrentOrg() org) {
    return this.projectsService.remove(id, org.id);
  }

  // ASSIGN AGENT
  @Patch(':id/assign-agent')
  @UseGuards(OrgMemberGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  assignAgent(
    @Param('id') id: string,
    @Body('agentId') agentId: string,
    @CurrentOrg() org,
  ) {
    return this.projectsService.assignAgent(id, agentId, org.id);
  }

  // ASSIGN TECHNICIAN
  @Patch(':id/assign-technician')
  @UseGuards(OrgMemberGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  assignTechnician(
    @Param('id') id: string,
    @Body('technicianId') technicianId: string,
    @CurrentOrg() org,
  ) {
    return this.projectsService.assignTechnician(id, technicianId, org.id);
  }

  // ASSIGN EDITOR
  @Patch(':id/assign-editor')
  @UseGuards(OrgMemberGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
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
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
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
