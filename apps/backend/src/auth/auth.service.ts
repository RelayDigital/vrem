import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OrgRole, OrgType, UserAccountType, ProviderUseCaseType, InvitationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuthenticatedUser } from './auth-context';
import { OAuth2Client } from 'google-auth-library';
import { OtpService } from '../otp/otp.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client | null;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
  ) {
    this.googleClient = process.env.GOOGLE_CLIENT_ID
      ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
      : null;
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
  ) {
    const allowedRoles: UserAccountType[] = [
      UserAccountType.PROVIDER,
      UserAccountType.AGENT,
      // COMPANY exists but is not user-facing; keeping allowed for admin/sales flows.
      UserAccountType.COMPANY,
    ];
    const accountTypeToStore = allowedRoles.includes(accountTypeIntent)
      ? accountTypeIntent
      : UserAccountType.AGENT;

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      // Check if account is deactivated
      if (existing.deactivatedAt) {
        throw new UnauthorizedException('Your account has been deactivated. Please contact support to reactivate.');
      }

      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          name: existing.name || name,
          accountType: existing.accountType || accountTypeToStore,
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
      },
    });
  }

  async register(
    email: string,
    name: string,
    password: string,
    accountTypeIntent: UserAccountType,
  ) {
    const allowedRoles: UserAccountType[] = [
      UserAccountType.PROVIDER,
      UserAccountType.AGENT,
      // COMPANY exists but is not user-facing; keeping allowed for admin/sales flows.
      UserAccountType.COMPANY,
    ];

    if (!allowedRoles.includes(accountTypeIntent)) {
      throw new UnauthorizedException('Invalid role selection');
    }

    // Check unique email
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new UnauthorizedException('Email already registered');

    const accountTypeToStore = accountTypeIntent;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with global role intent
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        accountType: accountTypeToStore,
      },
    });

    return this.finalizeAuth(user, name);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Check if account is deactivated
    if (user.deactivatedAt) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact support to reactivate.');
    }

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
        deactivatedAt: true,
      },
    });

    if (!user) return null;

    // Deactivated users should not be able to access the system
    if (user.deactivatedAt) return null;

    const personalOrg = await this.prisma.organizationMember.findFirst({
      where: { userId, organization: { type: OrgType.PERSONAL } },
      select: { orgId: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType,
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

  /**
   * Register a new user through the onboarding flow.
   * Validates OTP token, creates user, handles invite codes, and saves use cases.
   */
  async registerFromOnboarding(data: {
    otpToken: string;
    email: string;
    name: string;
    password: string;
    accountType: UserAccountType;
    inviteCode?: string;
    useCases?: ProviderUseCaseType[];
  }) {
    // 1. Validate OTP token
    const tokenResult = await this.otpService.validateToken(data.otpToken);

    // Verify email matches
    if (tokenResult.email.toLowerCase() !== data.email.toLowerCase()) {
      throw new BadRequestException('Email does not match verified email');
    }

    // 2. Check if email is already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    // 3. Validate account type
    const allowedRoles: UserAccountType[] = [
      UserAccountType.PROVIDER,
      UserAccountType.AGENT,
    ];

    if (!allowedRoles.includes(data.accountType)) {
      throw new BadRequestException('Invalid account type');
    }

    // 4. If invite code provided, validate it
    let invitation: any = null;
    if (data.inviteCode) {
      invitation = await this.prisma.invitation.findUnique({
        where: { token: data.inviteCode },
        include: { organization: true },
      });

      if (!invitation) {
        throw new BadRequestException('Invalid invite code');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new BadRequestException('Invite code has already been used');
      }

      // Check if invitation email matches (if specified)
      if (invitation.email && invitation.email.toLowerCase() !== data.email.toLowerCase()) {
        throw new BadRequestException('This invite code is for a different email');
      }
    }

    // 5. Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 6. Create user in transaction
    const user = await this.prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          name: data.name,
          password: hashedPassword,
          accountType: data.accountType,
        },
      });

      // Create personal organization
      const personalOrg = await tx.organization.create({
        data: {
          id: randomUUID(),
          name: `${data.name}'s Workspace`,
          type: OrgType.PERSONAL,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId: newUser.id,
          orgId: personalOrg.id,
          role: OrgRole.OWNER,
        },
      });

      // If invite code, join that organization
      if (invitation) {
        await tx.organizationMember.create({
          data: {
            userId: newUser.id,
            orgId: invitation.orgId,
            role: invitation.role,
          },
        });

        // Mark invitation as accepted
        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: InvitationStatus.ACCEPTED,
            accepted: true,
          },
        });
      }

      // If provider with use cases, save them
      if (data.accountType === UserAccountType.PROVIDER && data.useCases?.length) {
        await tx.providerUseCase.createMany({
          data: data.useCases.map((useCase) => ({
            userId: newUser.id,
            useCase,
          })),
        });
      }

      return newUser;
    });

    // 7. Mark OTP token as used
    await this.otpService.markTokenUsed(data.otpToken);

    // 8. Generate JWT token
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
        id: user.id,
        email: user.email,
        name: user.name,
        accountType: user.accountType,
        organizationId: membership?.orgId || null,
      },
      token,
    };
  }
}
