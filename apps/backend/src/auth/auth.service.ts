import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role, OrgRole, OrgType } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private async ensurePersonalOrganization(userId: string, name: string) {
    const existingPersonalMemberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
        organization: { type: OrgType.PERSONAL },
      },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });

    if (existingPersonalMemberships.length > 0) {
      // If more than one personal org, keep the first and remove extras
      const [primary, ...extras] = existingPersonalMemberships;
      if (extras.length > 0) {
        const extraIds = extras.map((m) => m.id);
        await this.prisma.organizationMember.deleteMany({
          where: { id: { in: extraIds } },
        });
      }
      return primary.organization;
    }

    const personalOrg = await this.prisma.organization.create({
      data: {
        id: randomUUID(),
        name: `${name || 'Personal'} Workspace`,
        type: OrgType.PERSONAL,
      },
    });

    await this.prisma.organizationMember.create({
      data: {
        userId,
        orgId: personalOrg.id,
        role: OrgRole.DISPATCHER,
      },
    });

    return personalOrg;
  }

  async register(email: string, name: string, password: string, role: Role) {
    // VALIDATION: role must be one of the defined global roles
    const allowedRoles: Role[] = [
      Role.DISPATCHER,
      Role.TECHNICIAN,
      Role.AGENT,
    ];

    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Invalid role selection');
    }

    // Check unique email
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new UnauthorizedException('Email already registered');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with global role
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role, // IMPORTANT: global identity role
      },
    });

    // Auto-create personal organization for technicians
    if (role === Role.TECHNICIAN) {
      await this.ensurePersonalOrganization(user.id, name);
    }

    // Create JWT
    const token = this.jwtService.sign({
      sub: user.id,
      role: user.role,
    });

    return {
      user: {
        ...user,
        organizationId: null, // New users have no org yet
      },
      token,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Ensure technicians have exactly one personal org
    if (user.role === Role.TECHNICIAN) {
      await this.ensurePersonalOrganization(user.id, user.name);
    }

    const token = this.jwtService.sign({ sub: user.id, role: user.role });

    // Fetch user's organization
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { orgId: true },
    });

    return {
      user: {
        ...user,
        organizationId: membership?.orgId || null,
      },
      token,
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Strip password from response
    const { password, ...safeUser } = user;

    // Fetch user's organization
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { orgId: true },
    });

    return {
      ...safeUser,
      organizationId: membership?.orgId || null,
    };
  }
}
