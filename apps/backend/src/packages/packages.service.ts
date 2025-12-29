import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgContext } from '../auth/auth-context';
import { CreatePackageDto, UpdatePackageDto } from './dto/create-package.dto';
import { CreateAddOnDto, UpdateAddOnDto } from './dto/create-addon.dto';

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  // =============================
  // Service Packages
  // =============================

  /**
   * Get all active packages for an organization.
   * Public endpoint - agents can view provider packages.
   */
  async getPackagesForOrg(orgId: string) {
    return this.prisma.servicePackage.findMany({
      where: {
        orgId,
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Get all packages for org (including inactive) - for management.
   */
  async getAllPackagesForOrg(ctx: OrgContext) {
    this.ensureCanManagePackages(ctx);

    return this.prisma.servicePackage.findMany({
      where: { orgId: ctx.org.id },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Get a single package by ID.
   */
  async getPackageById(id: string) {
    const pkg = await this.prisma.servicePackage.findUnique({
      where: { id },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    return pkg;
  }

  /**
   * Create a new service package.
   */
  async createPackage(ctx: OrgContext, dto: CreatePackageDto) {
    this.ensureCanManagePackages(ctx);

    return this.prisma.servicePackage.create({
      data: {
        orgId: ctx.org.id,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency || 'usd',
        mediaTypes: dto.mediaTypes,
        turnaroundDays: dto.turnaroundDays,
        photoCount: dto.photoCount,
        videoMinutes: dto.videoMinutes,
        features: dto.features || [],
        images: dto.images || [],
        displayOrder: dto.displayOrder || 0,
      },
    });
  }

  /**
   * Update a service package.
   */
  async updatePackage(ctx: OrgContext, id: string, dto: UpdatePackageDto) {
    this.ensureCanManagePackages(ctx);

    const pkg = await this.prisma.servicePackage.findFirst({
      where: { id, orgId: ctx.org.id },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    return this.prisma.servicePackage.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency,
        mediaTypes: dto.mediaTypes,
        isActive: dto.isActive,
        turnaroundDays: dto.turnaroundDays,
        photoCount: dto.photoCount,
        videoMinutes: dto.videoMinutes,
        features: dto.features,
        images: dto.images,
        displayOrder: dto.displayOrder,
      },
    });
  }

  /**
   * Delete a service package.
   */
  async deletePackage(ctx: OrgContext, id: string) {
    this.ensureCanManagePackages(ctx);

    const pkg = await this.prisma.servicePackage.findFirst({
      where: { id, orgId: ctx.org.id },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    await this.prisma.servicePackage.delete({
      where: { id },
    });

    return { success: true };
  }

  // =============================
  // Add-ons
  // =============================

  /**
   * Get all active add-ons for an organization.
   * Public endpoint - agents can view provider add-ons.
   */
  async getAddOnsForOrg(orgId: string) {
    return this.prisma.packageAddOn.findMany({
      where: {
        orgId,
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Get all add-ons for org (including inactive) - for management.
   */
  async getAllAddOnsForOrg(ctx: OrgContext) {
    this.ensureCanManagePackages(ctx);

    return this.prisma.packageAddOn.findMany({
      where: { orgId: ctx.org.id },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Get a single add-on by ID.
   */
  async getAddOnById(id: string) {
    const addOn = await this.prisma.packageAddOn.findUnique({
      where: { id },
    });

    if (!addOn) {
      throw new NotFoundException('Add-on not found');
    }

    return addOn;
  }

  /**
   * Create a new add-on.
   */
  async createAddOn(ctx: OrgContext, dto: CreateAddOnDto) {
    this.ensureCanManagePackages(ctx);

    return this.prisma.packageAddOn.create({
      data: {
        orgId: ctx.org.id,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency || 'usd',
        category: dto.category,
        displayOrder: dto.displayOrder || 0,
      },
    });
  }

  /**
   * Update an add-on.
   */
  async updateAddOn(ctx: OrgContext, id: string, dto: UpdateAddOnDto) {
    this.ensureCanManagePackages(ctx);

    const addOn = await this.prisma.packageAddOn.findFirst({
      where: { id, orgId: ctx.org.id },
    });

    if (!addOn) {
      throw new NotFoundException('Add-on not found');
    }

    return this.prisma.packageAddOn.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency,
        category: dto.category,
        isActive: dto.isActive,
        displayOrder: dto.displayOrder,
      },
    });
  }

  /**
   * Delete an add-on.
   */
  async deleteAddOn(ctx: OrgContext, id: string) {
    this.ensureCanManagePackages(ctx);

    const addOn = await this.prisma.packageAddOn.findFirst({
      where: { id, orgId: ctx.org.id },
    });

    if (!addOn) {
      throw new NotFoundException('Add-on not found');
    }

    await this.prisma.packageAddOn.delete({
      where: { id },
    });

    return { success: true };
  }

  // =============================
  // Pricing Calculation
  // =============================

  /**
   * Calculate total price for a package + selected add-ons with quantities.
   * @param packageId - The package ID
   * @param addOnIds - List of add-on IDs
   * @param addOnQuantities - Optional map of addOnId -> quantity (defaults to 1 for each)
   */
  async calculateTotal(
    packageId: string,
    addOnIds: string[],
    addOnQuantities?: Record<string, number>,
  ): Promise<{ total: number; currency: string; breakdown: any }> {
    const pkg = await this.prisma.servicePackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    const addOns = await this.prisma.packageAddOn.findMany({
      where: {
        id: { in: addOnIds },
        orgId: pkg.orgId,
        isActive: true,
      },
    });

    // Calculate add-ons total with quantities
    const addOnsTotal = addOns.reduce((sum, a) => {
      const qty = addOnQuantities?.[a.id] ?? 1;
      return sum + (a.price * qty);
    }, 0);

    return {
      total: pkg.price + addOnsTotal,
      currency: pkg.currency,
      breakdown: {
        package: {
          id: pkg.id,
          name: pkg.name,
          price: pkg.price,
        },
        addOns: addOns.map((a) => {
          const qty = addOnQuantities?.[a.id] ?? 1;
          return {
            id: a.id,
            name: a.name,
            price: a.price,
            quantity: qty,
            subtotal: a.price * qty,
          };
        }),
      },
    };
  }

  // =============================
  // Helpers
  // =============================

  private ensureCanManagePackages(ctx: OrgContext) {
    if (
      ctx.effectiveRole !== 'OWNER' &&
      ctx.effectiveRole !== 'ADMIN' &&
      ctx.effectiveRole !== 'PERSONAL_OWNER'
    ) {
      throw new ForbiddenException('Only owners and admins can manage packages');
    }
  }
}
