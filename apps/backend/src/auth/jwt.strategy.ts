import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from './auth-context';
import { OrgType, UserAccountType } from '@prisma/client';
import * as crypto from 'crypto';
import { Request } from 'express';

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    super();
  }

  /**
   * Idempotent user provisioning with race condition handling.
   * Creates user + personal org atomically, handles concurrent requests safely.
   */
  private async ensureUserProvisioned(clerkUserId: string): Promise<{
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    accountType: UserAccountType;
    deactivatedAt: Date | null;
  }> {
    console.log('User not found in DB, fetching from Clerk:', clerkUserId);
    const clerkUser = await clerkClient.users.getUser(clerkUserId);

    if (!clerkUser) {
      throw new UnauthorizedException('User not found in Clerk');
    }

    // Get metadata from Clerk
    const metadata = clerkUser.unsafeMetadata || {};
    const hasAccountTypeFromMetadata = !!metadata.accountType;
    const accountType = (metadata.accountType as UserAccountType) || UserAccountType.AGENT;
    const inviteCode = metadata.inviteCode as string | undefined;
    const useCases = metadata.useCases as string[] | undefined;

    // Check if the primary email is verified in Clerk
    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );
    const isEmailVerified = primaryEmail?.verification?.status === 'verified';
    const email = primaryEmail?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress || '';
    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';

    console.log('Creating user from Clerk data:', {
      clerkUserId,
      email,
      accountType,
      inviteCode,
      isEmailVerified,
      hasAvatar: !!clerkUser.imageUrl,
    });

    try {
      // Create user in a transaction
      const newUser = await this.prisma.$transaction(async (tx) => {
        // Create user with verified email and avatar from Clerk
        const createdUser = await tx.user.create({
          data: {
            clerkUserId,
            email,
            emailVerifiedAt: isEmailVerified ? new Date() : null,
            name,
            password: crypto.randomBytes(32).toString('hex'), // Random password, not used
            accountType,
            avatarUrl: clerkUser.imageUrl || null,
            // Only mark onboarding complete if accountType was explicitly provided via Clerk metadata
            // (from sign-up form). SSO users without metadata need to complete onboarding to choose their type.
            onboardingCompletedAt: hasAccountTypeFromMetadata ? new Date() : null,
          },
        });

        // Create personal organization
        const personalOrg = await tx.organization.create({
          data: {
            id: crypto.randomUUID(),
            name: `${createdUser.name || 'Personal'} Workspace`,
            type: OrgType.PERSONAL,
          },
        });

        await tx.organizationMember.create({
          data: {
            userId: createdUser.id,
            orgId: personalOrg.id,
            role: 'OWNER',
          },
        });

        // Handle invite code if present
        if (inviteCode) {
          const invitation = await tx.invitation.findUnique({
            where: { token: inviteCode },
          });

          if (invitation && invitation.status === 'PENDING') {
            await tx.organizationMember.create({
              data: {
                userId: createdUser.id,
                orgId: invitation.orgId,
                role: invitation.role,
              },
            });

            await tx.invitation.update({
              where: { id: invitation.id },
              data: {
                status: 'ACCEPTED',
                accepted: true,
              },
            });
          }
        }

        // Handle use cases for providers
        if (accountType === UserAccountType.PROVIDER && useCases?.length) {
          await tx.providerUseCase.createMany({
            data: useCases.map((useCase) => ({
              userId: createdUser.id,
              useCase: useCase as any,
            })),
          });
        }

        return createdUser;
      });

      console.log('User created successfully:', newUser.id);

      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatarUrl: newUser.avatarUrl,
        accountType: newUser.accountType,
        deactivatedAt: newUser.deactivatedAt,
      };
    } catch (error: any) {
      // Handle race condition: another request created the user first
      // Prisma P2002 is unique constraint violation
      if (error.code === 'P2002') {
        console.log('Race condition detected, user was created by another request. Retrying lookup...');

        // Retry lookup - the user should exist now
        const existingUser = await this.prisma.user.findUnique({
          where: { clerkUserId },
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            accountType: true,
            deactivatedAt: true,
          },
        });

        if (existingUser) {
          return existingUser;
        }
      }

      console.error('Failed to provision user from Clerk:', error);
      throw new UnauthorizedException('Failed to authenticate user');
    }
  }

  async validate(req: Request): Promise<AuthenticatedUser> {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('No token provided');
      }

      const token = authHeader.substring(7);

      // Verify the token with Clerk
      let payload;
      try {
        payload = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });
      } catch (verifyError) {
        console.error('Clerk token verification failed:', verifyError);
        throw new UnauthorizedException('Invalid token');
      }

      const clerkUserId = payload.sub;

      if (!clerkUserId) {
        throw new UnauthorizedException('Invalid token: missing subject');
      }

      // Find or create user by Clerk ID
      let user = await this.prisma.user.findUnique({
        where: { clerkUserId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          accountType: true,
          deactivatedAt: true,
        },
      });

      if (!user) {
        // Try to get user info from Clerk and create in our database
        // Use ensureUserProvisioned pattern for idempotency
        user = await this.ensureUserProvisioned(clerkUserId);
      } else {
        // Sync avatar from Clerk for existing users (in case it changed)
        try {
          const clerkUser = await clerkClient.users.getUser(clerkUserId);
          const clerkAvatarUrl = clerkUser?.imageUrl || null;

          // Update avatar if it changed in Clerk
          if (clerkAvatarUrl !== user.avatarUrl) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: { avatarUrl: clerkAvatarUrl },
            });
            user.avatarUrl = clerkAvatarUrl;
          }
        } catch (syncError) {
          // Don't fail auth if avatar sync fails, just log it
          console.warn('Failed to sync avatar from Clerk:', syncError);
        }
      }

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Deactivated users should not be able to access the system
      if (user.deactivatedAt) {
        throw new UnauthorizedException('Account has been deactivated');
      }

      // Get personal organization
      const personalOrg = await this.prisma.organizationMember.findFirst({
        where: { userId: user.id, organization: { type: OrgType.PERSONAL } },
        select: { orgId: true },
        orderBy: { createdAt: 'asc' },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        accountType: user.accountType,
        personalOrgId: personalOrg?.orgId || null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('JWT validation error:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
