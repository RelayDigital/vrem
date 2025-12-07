import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, OrgContextGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@CurrentUser() user: AuthenticatedUser, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    return this.dashboardService.getDashboardForUser(user, ctx);
  }
}
