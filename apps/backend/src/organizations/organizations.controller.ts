import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import type { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { OrgContextGuard } from '../auth/org-context.guard';
import { Public } from '../auth/public.decorator';

@Controller('organizations')
@UseGuards(JwtAuthGuard, OrgContextGuard)
export class OrganizationsController {
  constructor(private orgs: OrganizationsService) {}

  /**
   * Public endpoint to validate an invite code.
   * Returns organization info if valid.
   */
  @Public()
  @Get('invite/validate/:token')
  async validateInviteCode(@Param('token') token: string) {
    return this.orgs.validateInviteCode(token);
  }

  /**
   * Public endpoint to check for pending invitations by email.
   * Used during onboarding to detect if a user was invited.
   */
  @Public()
  @Get('invitations/by-email/:email')
  async getPendingInvitationsByEmail(@Param('email') email: string) {
    return this.orgs.getPendingInvitationsByEmail(email);
  }

  @Post()
  async createOrg(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.orgs.createOrganization(user, dto);
  }


  // GET /organizations - Returns the current user's organization memberships
  // This route must come before @Get(':orgId') to ensure proper route matching
  @Get()
  listMyOrgs(@CurrentUser() user) {
    return this.orgs.listUserOrganizations(user.id);
  }

  // Invite someone into an org
  @Post(':orgId/invite')
  invite(
    @Param('orgId') orgId: string,
    @Body() dto: CreateInviteDto,
    @Req() req,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ctx = req.orgContext as OrgContext;
    if (ctx.org.id !== orgId) {
      throw new ForbiddenException('Active organization does not match request');
    }
    return this.orgs.createInvite(ctx, dto, user);
  }

  // Accept invite
  @Post('accept-invite')
  acceptInvite(
    @CurrentUser() user,
    @Body() dto: AcceptInviteDto,
  ) {
    return this.orgs.acceptInvite(user.id, dto);
  }

  // Get organization by ID
  @Get(':orgId')
  getOrganization(
    @Param('orgId') orgId: string,
    @Req() req,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.orgs.getOrganizationById(orgId, ctx, user);
  }

  // List organization members (with user details)
  @Get(':orgId/members')
  listMembers(@Param('orgId') orgId: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    if (ctx.org.id !== orgId) {
      throw new ForbiddenException('Active organization does not match request');
    }
    return this.orgs.listOrganizationMembers(ctx);
  }

  // Update organization settings
  @Patch(':orgId/settings')
  updateOrganizationSettings(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateOrganizationSettingsDto,
    @Req() req: any,
  ) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    if (ctx.org.id !== orgId) {
      throw new ForbiddenException('Active organization does not match request');
    }

    return this.orgs.updateOrganizationSettings(ctx, dto, user);
  }

  @Patch(':orgId/members/:memberId/role')
  async updateMemberRole(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: any,
  ) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    if (ctx.org.id !== orgId) {
      throw new ForbiddenException('Active organization does not match request');
    }
    return this.orgs.updateMemberRole(ctx, memberId, dto.role, user);
  }
}
