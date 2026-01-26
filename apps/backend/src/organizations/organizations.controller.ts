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
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
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
import { AuditLogger, AuditEventType, maskToken } from '../config/audit-log';
import { ApiOrgScoped } from '../common/decorators/api-org-scoped.decorator';

@ApiTags('Organizations')
@ApiOrgScoped()
@Controller('organizations')
@UseGuards(JwtAuthGuard, OrgContextGuard)
export class OrganizationsController {
  private readonly audit: AuditLogger;

  constructor(private orgs: OrganizationsService) {
    this.audit = new AuditLogger(new Logger(OrganizationsController.name));
  }

  /**
   * Public endpoint to validate an invite code.
   * Returns organization info if valid.
   */
  // Rate limit: 20 requests per minute per IP (prevent enumeration)
  @ApiOperation({ summary: 'Validate an invite code (public)' })
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Public()
  @Get('invite/validate/:token')
  async validateInviteCode(@Param('token') token: string, @Req() req: any) {
    const result = await this.orgs.validateInviteCode(token);

    this.audit.log(AuditEventType.INVITE_VALIDATE, req, {
      tokenMasked: maskToken(token),
      valid: result.valid,
      orgId: result.organization?.id,
    });

    return result;
  }

  /**
   * Public endpoint to check for pending invitations by email.
   * Used during onboarding to detect if a user was invited.
   */
  // Rate limit: 10 requests per minute per IP (prevent email enumeration)
  @ApiOperation({ summary: 'Get pending invitations by email (public)' })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Public()
  @Get('invitations/by-email/:email')
  async getPendingInvitationsByEmail(@Param('email') email: string, @Req() req: any) {
    const result = await this.orgs.getPendingInvitationsByEmail(email);

    // Mask email in logs (show first 2 chars + domain)
    const emailParts = email.split('@');
    const maskedEmail = emailParts.length === 2
      ? `${emailParts[0].slice(0, 2)}***@${emailParts[1]}`
      : '***';

    this.audit.log(AuditEventType.INVITE_LOOKUP_BY_EMAIL, req, {
      emailMasked: maskedEmail,
      inviteCount: result.invitations.length,
    });

    return result;
  }

  @ApiOperation({ summary: 'Create a new organization' })
  @Post()
  async createOrg(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.orgs.createOrganization(user, dto);
  }


  // GET /organizations - Returns the current user's organization memberships
  // This route must come before @Get(':orgId') to ensure proper route matching
  @ApiOperation({ summary: 'List my organizations' })
  @Get()
  listMyOrgs(@CurrentUser() user) {
    return this.orgs.listUserOrganizations(user.id);
  }

  // Invite someone into an org
  @ApiOperation({ summary: 'Invite a user to an organization' })
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
  // Rate limit: 10 requests per minute per IP (user-initiated action)
  @ApiOperation({ summary: 'Accept an organization invite' })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('accept-invite')
  async acceptInvite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcceptInviteDto,
    @Req() req: any,
  ) {
    const result = await this.orgs.acceptInvite(user.id, dto);

    this.audit.log(AuditEventType.INVITE_ACCEPT, req, {
      tokenMasked: maskToken(dto.token),
      orgId: result.orgId,
      inviteType: result.inviteType,
    });

    return result;
  }

  // Get organization by ID
  @ApiOperation({ summary: 'Get organization by ID' })
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
  @ApiOperation({ summary: 'List organization members' })
  @Get(':orgId/members')
  listMembers(@Param('orgId') orgId: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    if (ctx.org.id !== orgId) {
      throw new ForbiddenException('Active organization does not match request');
    }
    return this.orgs.listOrganizationMembers(ctx);
  }

  // Update organization settings
  @ApiOperation({ summary: 'Update organization settings' })
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

  @ApiOperation({ summary: 'Update a member role' })
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
