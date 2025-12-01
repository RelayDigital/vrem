import {
  Controller,
  Get,
  Param,
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
  @Roles(Role.DISPATCHER)
  getProjects(@CurrentOrg() org) {
    return this.projectsService.findForOrg(org.id);
  }

  // GET only user's projects for this org
  @Get('mine')
  @UseGuards(OrgMemberGuard)
  findMine(@CurrentUser() user, @CurrentOrg() org) {
    // For agents, org might be null if they're not org members
    // They can still access their projects by agentId
    const orgId = org?.id || null;
    return this.projectsService.findForUser(user.id, user.role, orgId);
  }

  // GET messages for a project
  @Get(':id/messages')
  @UseGuards(OrgMemberGuard)
  @Roles(Role.AGENT, Role.TECHNICIAN, Role.DISPATCHER, Role.DISPATCHER, Role.DISPATCHER)
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
  @Roles(Role.AGENT, Role.TECHNICIAN, Role.DISPATCHER, Role.DISPATCHER, Role.DISPATCHER)
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
  @Roles(Role.AGENT, Role.DISPATCHER, Role.DISPATCHER)
  createProject(
    @CurrentUser() user,
    @CurrentOrg() org,
    @Body() dto: CreateProjectDto,
  ) {
    dto.agentId = dto.agentId || user.id;

    if (user.role === Role.AGENT) {
      dto.agentId = user.id;
      // For agents, orgId might come from the request body if they're not org members
      // But we still need an orgId to create the project
      const orgId = org?.id || dto.orgId;
      if (!orgId) {
        throw new ForbiddenException('Organization ID is required to create a project');
      }
      return this.projectsService.create(dto, orgId);
    }
    // PM/Admin must be org members, so org.id should always exist
    if (!org?.id) {
      throw new ForbiddenException('Organization ID is required');
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
  @Roles(Role.DISPATCHER, Role.DISPATCHER)
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
  @Roles(Role.DISPATCHER, Role.DISPATCHER)
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
  @Roles(Role.DISPATCHER, Role.DISPATCHER)
  remove(@Param('id') id: string, @CurrentOrg() org) {
    return this.projectsService.remove(id, org.id);
  }

  // ASSIGN AGENT
  @Patch(':id/assign-agent')
  @UseGuards(OrgMemberGuard, RolesGuard)
  @Roles(Role.DISPATCHER, Role.DISPATCHER)
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
  @Roles(Role.DISPATCHER)
  assignTechnician(
    @Param('id') id: string,
    @Body('technicianId') technicianId: string,
    @CurrentOrg() org,
    @Req() req,
  ) {
    const membershipRole = req?.membership?.role;
    const allowed = ['OWNER', 'ADMIN', 'DISPATCHER', 'PROJECT_MANAGER'];
    if (!allowed.includes(membershipRole)) {
      throw new ForbiddenException('You are not allowed to assign technicians for this organization');
    }
    return this.projectsService.assignTechnician(id, technicianId, org.id);
  }

  // ASSIGN CUSTOMER
  @Patch(':id/assign-customer')
  @UseGuards(OrgMemberGuard, RolesGuard)
  @Roles(Role.DISPATCHER)
  assignCustomer(
    @Param('id') id: string,
    @Body('customerId') customerId: string,
    @CurrentOrg() org,
    @Req() req,
  ) {
    const membershipRole = req?.membership?.role;
    const allowed = ['OWNER', 'ADMIN', 'DISPATCHER', 'PROJECT_MANAGER'];
    if (!allowed.includes(membershipRole)) {
      throw new ForbiddenException('You are not allowed to assign customers for this organization');
    }
    return this.projectsService.assignCustomer(id, customerId, org.id);
  }

  // ASSIGN EDITOR
  @Patch(':id/assign-editor')
  @UseGuards(OrgMemberGuard, RolesGuard)
  @Roles(Role.DISPATCHER, Role.DISPATCHER)
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
  @Roles(Role.DISPATCHER, Role.DISPATCHER)
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
