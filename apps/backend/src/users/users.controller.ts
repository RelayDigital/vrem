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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUseCasesDto } from './dto/update-use-cases.dto';
import { AccountActionDto } from './dto/account-action.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';
import { OrgRolesGuard } from '../auth/org-roles.guard';
import { OrgRoles } from '../auth/org-roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth-context';
import { UserAccountType } from '@prisma/client';

/**
 * User account management endpoints
 *
 * /me/* endpoints - Authenticated user managing their own account
 * Other endpoints - Admin-level access for managing users
 */
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
  @Get('me/use-cases')
  @UseGuards(JwtAuthGuard)
  getMyUseCases(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getUseCases(user.id);
  }

  /**
   * Update the current user's use cases (services they provide)
   * Only applicable for PROVIDER accounts
   */
  @Patch('me/use-cases')
  @UseGuards(JwtAuthGuard)
  updateMyUseCases(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUseCasesDto,
  ) {
    return this.usersService.updateUseCases(user.id, dto.useCases);
  }

  // =============================
  // Admin endpoints
  // =============================

  @Post()
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN')
  findAll(@Query('role') role?: string) {
    if (role) return this.usersService.findByRole(role as UserAccountType);
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, OrgContextGuard, OrgRolesGuard)
  @OrgRoles('OWNER', 'ADMIN')
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
