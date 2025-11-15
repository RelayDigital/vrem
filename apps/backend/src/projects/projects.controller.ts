import { Controller, Get, Param, UseGuards, Body, Patch, Req } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, ProjectStatus } from '@prisma/client';

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
}
