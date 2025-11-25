import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { OrgMemberGuard } from './org-member.guard';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private orgs: OrganizationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @Roles(Role.ADMIN) // Only global ADMIN can create an organization
  async createOrg(
    @CurrentUser() user,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.orgs.createOrganization(user.id, dto);
  }


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
}
