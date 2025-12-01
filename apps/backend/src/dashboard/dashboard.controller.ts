import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Role } from '@prisma/client';
import { CurrentOrg } from '../organizations/current-org.decorator';
import { OrgMemberGuard } from '../organizations/org-member.guard';

type CurrentUserType = {
  id: string;
  role: Role;
};

@Controller('dashboard')
@UseGuards(JwtAuthGuard, OrgMemberGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@CurrentUser() user: CurrentUserType, @CurrentOrg() org) {
    return this.dashboardService.getDashboardForUser(user, org?.id || null);
  }
}
