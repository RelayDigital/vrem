import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUseCasesDto } from './dto/update-use-cases.dto';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';
import { SwitchAccountTypeDto } from './dto/switch-account-type.dto';
import { AccountActionDto } from './dto/account-action.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';
import { OrgRolesGuard } from '../auth/org-roles.guard';
import { OrgRoles } from '../auth/org-roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth-context';
import { UserAccountType } from '@prisma/client';
import { ApiOrgScoped } from '../common/decorators/api-org-scoped.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // =============================
  // Self-service account endpoints
  // =============================

  /**
   * Update the current user's profile (name, avatar)
   * Self-service endpoint - no org context required
   */
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBearerAuth('bearer')
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.update(user.id, dto);
  }

  /**
   * Deactivate the current user's account
   * Requires password confirmation
   */
  @ApiOperation({ summary: 'Deactivate current user account' })
  @ApiBearerAuth('bearer')
  @Post('me/deactivate')
  @UseGuards(JwtAuthGuard)
  deactivateMyAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AccountActionDto,
  ) {
    return this.usersService.deactivateAccount(user.id, dto.password);
  }

  /**
   * Reactivate the current user's account
   * Only works if account was previously deactivated
   */
  @ApiOperation({ summary: 'Reactivate current user account' })
  @ApiBearerAuth('bearer')
  @Post('me/reactivate')
  @UseGuards(JwtAuthGuard)
  reactivateMyAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.reactivateAccount(user.id);
  }

  /**
   * Permanently delete the current user's account
   * Requires password confirmation
   * This action cannot be undone
   */
  @ApiOperation({ summary: 'Permanently delete current user account' })
  @ApiBearerAuth('bearer')
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteMyAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AccountActionDto,
  ) {
    return this.usersService.deleteAccount(user.id, dto.password);
  }

  /**
   * Get the current user's use cases (services they provide)
   * Only applicable for PROVIDER accounts
   */
  @ApiOperation({ summary: 'Get current user use cases' })
  @ApiBearerAuth('bearer')
  @Get('me/use-cases')
  @UseGuards(JwtAuthGuard)
  getMyUseCases(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getUseCases(user.id);
  }

  /**
   * Update the current user's use cases (services they provide)
   * Only applicable for PROVIDER accounts
   */
  @ApiOperation({ summary: 'Update current user use cases' })
  @ApiBearerAuth('bearer')
  @Patch('me/use-cases')
  @UseGuards(JwtAuthGuard)
  updateMyUseCases(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUseCasesDto,
  ) {
    return this.usersService.updateUseCases(user.id, dto.useCases);
  }

  /**
   * Get the current user's notification preferences
   */
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiBearerAuth('bearer')
  @Get('me/notification-preferences')
  @UseGuards(JwtAuthGuard)
  getMyNotificationPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getNotificationPreferences(user.id);
  }

  /**
   * Update the current user's notification preferences
   */
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiBearerAuth('bearer')
  @Patch('me/notification-preferences')
  @UseGuards(JwtAuthGuard)
  updateMyNotificationPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPrefsDto,
  ) {
    return this.usersService.updateNotificationPreferences(user.id, dto);
  }

  /**
   * Switch account type between AGENT and PROVIDER
   */
  @ApiOperation({ summary: 'Switch account type (AGENT ↔ PROVIDER)' })
  @ApiBearerAuth('bearer')
  @Patch('me/account-type')
  @UseGuards(JwtAuthGuard)
  switchAccountType(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SwitchAccountTypeDto,
  ) {
    return this.usersService.switchAccountType(user.id, dto.accountType);
  }

  /**
   * Get the org context for the org switcher.
   *
   * This is the canonical endpoint for building org switcher UI.
   * Returns:
   * - personalOrg: Always present, the user's personal workspace
   * - memberships: TEAM and COMPANY orgs where user is a member (with role + metadata)
   * - customerOfOrgs: For AGENT accounts, orgs where they are linked as a customer
   * - accountType: User's account type (AGENT, PROVIDER, COMPANY)
   *
   * Self-service endpoint - no org context required
   */
  @ApiOperation({ summary: 'Get org context for org switcher UI' })
  @ApiBearerAuth('bearer')
  @Get('me/org-context')
  @UseGuards(JwtAuthGuard)
  getMyOrgContext(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getOrgContext(user.id);
  }

  // =============================
  // Admin endpoints
  // =============================

  @ApiOperation({ summary: 'Create a user (admin)' })
  @ApiOrgScoped()
  @Post()
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @ApiOperation({ summary: 'List all users (admin)' })
  @ApiOrgScoped()
  @Get()
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN')
  findAll(@Query('role') role?: string) {
    if (role) return this.usersService.findByRole(role as UserAccountType);
    return this.usersService.findAll();
  }

  @ApiOperation({ summary: 'Get user by ID (admin)' })
  @ApiOrgScoped()
  @Get(':id')
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @ApiOperation({ summary: 'Update user by ID (admin)' })
  @ApiOrgScoped()
  @Patch(':id')
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete user by ID (admin)' })
  @ApiOrgScoped()
  @Delete(':id')
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN')
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
