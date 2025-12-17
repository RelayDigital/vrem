import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CompanyRequestStatus, OrgRole, OrgType, UserAccountType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuthenticatedUser } from './auth-context';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client | null;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.googleClient = process.env.GOOGLE_CLIENT_ID
      ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
      : null;
  }

  /**
   * Resolve the requested account type into a stored account type plus a company-request flag.
   * COMPANY intent is stored as AGENT with a pending company request.
   */
  private resolveAccountTypeIntent(role: UserAccountType) {
    const allowedRoles: UserAccountType[] = [
      UserAccountType.COMPANY,
      UserAccountType.PROVIDER,
      UserAccountType.AGENT,
    ];

    const normalizedIntent = allowedRoles.includes(role)
      ? role
      : UserAccountType.AGENT;

    const companyRequested = normalizedIntent === UserAccountType.COMPANY;
    const accountTypeToStore = companyRequested
      ? UserAccountType.AGENT
      : normalizedIntent;

    return { accountTypeToStore, companyRequested };
  }

  private async finalizeAuth(user: any, name?: string) {
    // Ensure personal org exists
    await this.ensurePersonalOrganization(user.id, name || user.name);

    const token = this.jwtService.sign({
      sub: user.id,
      role: user.accountType,
    });

    // Fetch user's first organization membership
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
        role: OrgRole.OWNER,
      },
    });

    return personalOrg;
  }

  /**
   * Create or update a user from an OAuth profile while preserving account intent.
   */
  private async upsertUserFromProfile(
    email: string,
    name: string,
    accountTypeIntent: UserAccountType,
    companyRequestNote?: string,
  ) {
    const { accountTypeToStore, companyRequested } =
      this.resolveAccountTypeIntent(accountTypeIntent);

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      const shouldFlagCompany =
        companyRequested &&
        (existing.companyRequestStatus === CompanyRequestStatus.NONE ||
          existing.companyRequestStatus === CompanyRequestStatus.REJECTED);

      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          name: existing.name || name,
          accountType: existing.accountType || accountTypeToStore,
          ...(shouldFlagCompany && {
            companyRequestStatus: CompanyRequestStatus.PENDING,
            companyRequestedAt: new Date(),
            companyRequestNote: companyRequestNote || existing.companyRequestNote,
          }),
        },
      });
      return updated;
    }

    const randomPassword = randomUUID();
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    return this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        accountType: accountTypeToStore,
        companyRequestStatus: companyRequested
          ? CompanyRequestStatus.PENDING
          : CompanyRequestStatus.NONE,
        companyRequestedAt: companyRequested ? new Date() : null,
        companyRequestNote: companyRequested ? companyRequestNote : null,
      },
    });
  }

  async register(
    email: string,
    name: string,
    password: string,
    accountTypeIntent: UserAccountType,
    companyRequestNote?: string,
  ) {
    const allowedRoles: UserAccountType[] = [
      UserAccountType.COMPANY,
      UserAccountType.PROVIDER,
      UserAccountType.AGENT,
    ];

    if (!allowedRoles.includes(accountTypeIntent)) {
      throw new UnauthorizedException('Invalid role selection');
    }

    // Check unique email
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new UnauthorizedException('Email already registered');

    const { accountTypeToStore, companyRequested } =
      this.resolveAccountTypeIntent(accountTypeIntent);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with global role intent
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        accountType: accountTypeToStore,
        companyRequestStatus: companyRequested
          ? CompanyRequestStatus.PENDING
          : CompanyRequestStatus.NONE,
        companyRequestedAt: companyRequested ? new Date() : null,
        companyRequestNote: companyRequested ? companyRequestNote : null,
      },
    });

    return this.finalizeAuth(user, name);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.finalizeAuth(user);
  }

  private async verifyGoogleToken(idToken: string) {
    if (!this.googleClient) {
      throw new UnauthorizedException('Google OAuth not configured');
    }
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) {
        throw new UnauthorizedException('Google token missing email');
      }
      return {
        email: payload.email,
        name: payload.name || payload.email,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private async verifyFacebookToken(accessToken: string) {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) {
      throw new UnauthorizedException('Facebook OAuth not configured');
    }

    const appToken = `${appId}|${appSecret}`;

    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(
      accessToken,
    )}&access_token=${encodeURIComponent(appToken)}`;
    const debugRes = await fetch(debugUrl);
    const debugJson = await debugRes.json();
    if (!debugRes.ok || !debugJson?.data?.is_valid) {
      throw new UnauthorizedException('Invalid Facebook token');
    }

    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(
        accessToken,
      )}`,
    );
    const profile = await profileRes.json();

    if (!profile?.email) {
      throw new UnauthorizedException('Facebook profile missing email');
    }

    return {
      email: profile.email,
      name: profile.name || profile.email,
    };
  }

  async oauthLogin(
    provider: 'google' | 'facebook',
    dto: {
      token: string;
      accountType: UserAccountType;
      name?: string;
      companyRequestNote?: string;
    },
  ) {
    const profile =
      provider === 'google'
        ? await this.verifyGoogleToken(dto.token)
        : await this.verifyFacebookToken(dto.token);

    const user = await this.upsertUserFromProfile(
      profile.email,
      dto.name || profile.name || profile.email,
      dto.accountType,
      dto.companyRequestNote,
    );

    return this.finalizeAuth(user, dto.name || profile.name);
  }

  async validateUser(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        accountType: true,
      },
    });

    if (!user) return null;

    const personalOrg = await this.prisma.organizationMember.findFirst({
      where: { userId, organization: { type: OrgType.PERSONAL } },
      select: { orgId: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      ...user,
      personalOrgId: personalOrg?.orgId || null,
    };
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
