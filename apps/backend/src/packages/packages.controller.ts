import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgContextGuard } from '../auth/org-context.guard';
import { CreatePackageDto, UpdatePackageDto } from './dto/create-package.dto';
import { CreateAddOnDto, UpdateAddOnDto } from './dto/create-addon.dto';
import { ApiOrgScoped } from '../common/decorators/api-org-scoped.decorator';
import type { OrgContext } from '../auth/auth-context';

@ApiTags('Packages')
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  // =============================
  // Public endpoints (for agents viewing provider packages)
  // =============================

  /**
   * Get all active packages for an organization.
   * Public - agents can view provider packages.
   */
  @ApiOperation({ summary: 'Get active packages for an organization' })
  @Get('org/:orgId')
  async getPackagesForOrg(@Param('orgId') orgId: string) {
    return this.packagesService.getPackagesForOrg(orgId);
  }

  /**
   * Get all active add-ons for an organization.
   * Public - agents can view provider add-ons.
   */
  @ApiOperation({ summary: 'Get active add-ons for an organization' })
  @Get('org/:orgId/addons')
  async getAddOnsForOrg(@Param('orgId') orgId: string) {
    return this.packagesService.getAddOnsForOrg(orgId);
  }

  /**
   * Calculate total price for package + add-ons with quantities.
   */
  @ApiOperation({ summary: 'Calculate price for package and add-ons' })
  @Post('calculate')
  async calculateTotal(
    @Body() body: { packageId: string; addOnIds: string[]; addOnQuantities?: Record<string, number> },
  ) {
    return this.packagesService.calculateTotal(
      body.packageId,
      body.addOnIds || [],
      body.addOnQuantities,
    );
  }

  // =============================
  // Management endpoints (for company admins)
  // =============================

  /**
   * Get all packages for current org (including inactive).
   */
  @ApiOperation({ summary: 'List all packages including inactive' })
  @ApiOrgScoped()
  @Get()
  @UseGuards(JwtAuthGuard, OrgContextGuard)
  async getAllPackages(@Req() req: any) {
    const ctx = req.orgContext as OrgContext;
    return this.packagesService.getAllPackagesForOrg(ctx);
  }

  /**
   * Get all add-ons for current org (including inactive).
   */
  @ApiOperation({ summary: 'List all add-ons including inactive' })
  @ApiOrgScoped()
  @Get('addons')
  @UseGuards(JwtAuthGuard, OrgContextGuard)
  async getAllAddOns(@Req() req: any) {
    const ctx = req.orgContext as OrgContext;
    return this.packagesService.getAllAddOnsForOrg(ctx);
  }

  /**
   * Create a new package.
   */
  @ApiOperation({ summary: 'Create a package' })
  @ApiOrgScoped()
  @Post()
  @UseGuards(JwtAuthGuard, OrgContextGuard)
  async createPackage(@Req() req: any, @Body() dto: CreatePackageDto) {
    const ctx = req.orgContext as OrgContext;
    return this.packagesService.createPackage(ctx, dto);
  }

  /**
   * Update a package.
   */
  @ApiOperation({ summary: 'Update a package' })
  @ApiOrgScoped()
  @Put(':id')
  @UseGuards(JwtAuthGuard, OrgContextGuard)
  async updatePackage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePackageDto,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.packagesService.updatePackage(ctx, id, dto);
  }

  /**
   * Delete a package.
   */
  @ApiOperation({ summary: 'Delete a package' })
  @ApiOrgScoped()
  @Delete(':id')
  @UseGuards(JwtAuthGuard, OrgContextGuard)
  async deletePackage(@Req() req: any, @Param('id') id: string) {
    const ctx = req.orgContext as OrgContext;
    return this.packagesService.deletePackage(ctx, id);
  }

  /**
   * Create a new add-on.
   */
  @ApiOperation({ summary: 'Create an add-on' })
  @ApiOrgScoped()
  @Post('addons')
  @UseGuards(JwtAuthGuard, OrgContextGuard)
  async createAddOn(@Req() req: any, @Body() dto: CreateAddOnDto) {
    const ctx = req.orgContext as OrgContext;
    return this.packagesService.createAddOn(ctx, dto);
  }

  /**
   * Update an add-on.
   */
  @ApiOperation({ summary: 'Update an add-on' })
  @ApiOrgScoped()
  @Put('addons/:id')
  @UseGuards(JwtAuthGuard, OrgContextGuard)
  async updateAddOn(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddOnDto,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.packagesService.updateAddOn(ctx, id, dto);
  }

  /**
   * Delete an add-on.
   */
  @ApiOperation({ summary: 'Delete an add-on' })
  @ApiOrgScoped()
  @Delete('addons/:id')
  @UseGuards(JwtAuthGuard, OrgContextGuard)
  async deleteAddOn(@Req() req: any, @Param('id') id: string) {
    const ctx = req.orgContext as OrgContext;
    return this.packagesService.deleteAddOn(ctx, id);
  }
}
