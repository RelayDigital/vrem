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
import { OrgMemberGuard } from './org-member.guard';
import { Role, OrgRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private orgs: OrganizationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @Roles(Role.DISPATCHER) // Only global ADMIN can create an organization
  async createOrg(
    @CurrentUser() user,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.orgs.createOrganization(user.id, dto);
  }


  // GET /organizations - Returns the current user's organization memberships
  // This route must come before @Get(':orgId') to ensure proper route matching
  @Get()
  listMyOrgs(@CurrentUser() user) {
    return this.orgs.listUserOrganizations(user.id);
  }

  // Invite someone into an org
  @UseGuards(OrgMemberGuard)
  @Post(':orgId/invite')
  invite(
    @Param('orgId') orgId: string,
    @Body() dto: CreateInviteDto,
    @CurrentUser() user,
  ) {
    return this.orgs.createInvite(orgId, dto, user.id);
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
  @UseGuards(OrgMemberGuard)
  @Get(':orgId')
  getOrganization(@Param('orgId') orgId: string) {
    return this.orgs.getOrganizationById(orgId);
  }

  // List organization members (with user details)
  @UseGuards(OrgMemberGuard)
  @Get(':orgId/members')
  listMembers(@Param('orgId') orgId: string) {
    return this.orgs.listOrganizationMembers(orgId);
  }

  // Update organization settings
  @UseGuards(OrgMemberGuard)
  @Patch(':orgId/settings')
  updateOrganizationSettings(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateOrganizationSettingsDto,
    @Req() req: any,
  ) {
    // Check if user has OWNER or ADMIN role in the organization
    const membership = req.membership || req.activeOrgMembership;
    if (
      !membership ||
      (membership.role !== OrgRole.OWNER &&
        membership.role !== OrgRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only OWNER and ADMIN can update organization settings',
      );
    }

    return this.orgs.updateOrganizationSettings(orgId, dto);
  }
}
