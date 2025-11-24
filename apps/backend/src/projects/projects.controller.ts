import { Controller, Get, Param, UseGuards, Body, Patch, Req, Post, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, ProjectStatus } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  findAll() {
    return this.projectsService.findAll();
  }

  @Get('mine')
  findMine(@Req() req) {
    const user = req.user;
    return this.projectsService.findForUser(user.id, user.role);
  }

  @Patch(':id/status')
  @Roles(Role.TECHNICIAN, Role.EDITOR, Role.PROJECT_MANAGER, Role.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ProjectStatus,
    @CurrentUser() user: any
  ) {
    return this.projectsService.updateStatus(id, status, user);
  }

  // GET messages for a project
  @Get(':id/messages')
  @Roles(
    Role.AGENT,
    Role.TECHNICIAN,
    Role.EDITOR,
    Role.PROJECT_MANAGER,
    Role.ADMIN
  )
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.projectsService.getMessages(id, user);
  }


  // POST a new message
  @Post(':id/messages')
  @Roles(
    Role.AGENT,
    Role.TECHNICIAN,
    Role.EDITOR,
    Role.PROJECT_MANAGER,
    Role.ADMIN
  )
  addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: any
  ) {
    return this.projectsService.addMessage(id, dto, user);
  }


  @Post()
  @Roles(Role.AGENT, Role.PROJECT_MANAGER)
  createProject(
    @CurrentUser() user: any,
    @Body() dto: CreateProjectDto,
  ) {
    if (user.role === Role.AGENT) {
      dto.agentId = user.id;
    }
    return this.projectsService.create(dto);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.findOneForUser(id, user.id, user.role);
  }


  @Patch(':id/assign')
  @Roles(Role.PROJECT_MANAGER, Role.ADMIN)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignProjectDto
  ) {
    return this.projectsService.assign(id, dto);
  }


  @Patch(':id')
  @Roles(Role.PROJECT_MANAGER, Role.ADMIN)
  updateProject(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto
  ) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.PROJECT_MANAGER, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @Patch(':id/assign-agent')
  assignAgent(
    @Param('id') id: string,
    @Body('agentId') agentId: string,
  ) {
    return this.projectsService.assignAgent(id, agentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @Patch(':id/assign-technician')
  assignTechnician(
    @Param('id') id: string,
    @Body('technicianId') technicianId: string,
  ) {
    return this.projectsService.assignTechnician(id, technicianId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @Patch(':id/assign-editor')
  assignEditor(
    @Param('id') id: string,
    @Body('editorId') editorId: string,
  ) {
    return this.projectsService.assignEditor(id, editorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  @Patch(':id/schedule')
  scheduleProject(
    @Param('id') id: string,
    @Body('scheduledTime') scheduledTime: string,
  ) {
    return this.projectsService.scheduleProject(id, new Date(scheduledTime));
  }


}
