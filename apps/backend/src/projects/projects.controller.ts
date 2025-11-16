import { Controller, Get, Param, UseGuards, Body, Patch, Req, Post, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, ProjectStatus } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
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
    @Body('status') status: ProjectStatus
  ) {
    return this.projectsService.updateStatus(id, status);
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

}
