import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const OTP_EXPIRY_MINUTES = 10;
const RATE_LIMIT_WINDOW_MINUTES = 10;
const MAX_REQUESTS_PER_WINDOW = 5;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Generate and store an OTP for the given email.
   * Returns success status and expiration time.
   */
  async sendOtp(email: string): Promise<{ success: boolean; expiresAt: Date }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    // Rate limiting: check OTP requests in the last 10 minutes
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - RATE_LIMIT_WINDOW_MINUTES);

    const recentRequests = await this.prisma.emailOtp.count({
      where: {
        email: normalizedEmail,
        createdAt: { gte: windowStart },
      },
    });

    if (recentRequests >= MAX_REQUESTS_PER_WINDOW) {
      throw new BadRequestException(
        'Too many OTP requests. Please try again later.',
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the code for storage
    const hashedCode = await bcrypt.hash(code, 10);

    // Generate verification token (issued after successful verify)
    const token = randomUUID();

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Store the OTP
    await this.prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        code: hashedCode,
        token,
        expiresAt,
      },
    });

    // Send email with OTP code
    const emailSent = await this.emailService.sendOtpEmail(normalizedEmail, code);

    if (!emailSent) {
      this.logger.warn(`Failed to send OTP email to ${normalizedEmail}`);
      // Still return success - the OTP was created, email delivery is best-effort
      // In production, you might want to throw an error instead
    }

    this.logger.log(`OTP sent to ${normalizedEmail}`);

    return {
      success: true,
      expiresAt,
    };
  }

  /**
   * Verify an OTP code for the given email.
   * Returns a verification token on success.
   */
  async verifyOtp(
    email: string,
    code: string,
  ): Promise<{ valid: boolean; token: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Find the most recent unexpired, unused OTP for this email
    const otp = await this.prisma.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        verified: false,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new UnauthorizedException('No valid OTP found. Please request a new code.');
    }

    // Verify the code
    const isValid = await bcrypt.compare(code, otp.code);

    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    // Mark as verified
    await this.prisma.emailOtp.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    return {
      valid: true,
      token: otp.token,
    };
  }

  /**
   * Validate an OTP token for registration.
   * Returns the email if valid, throws if not.
   */
  async validateToken(token: string): Promise<{ email: string }> {
    // Token expires 1 hour after verification
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const otp = await this.prisma.emailOtp.findFirst({
      where: {
        token,
        verified: true,
        usedAt: null,
      },
    });

    if (!otp) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    // Check if token is too old (1 hour after creation for verified tokens)
    const tokenCreatedAt = otp.createdAt;
    const maxAge = new Date(tokenCreatedAt);
    maxAge.setHours(maxAge.getHours() + 1);

    if (new Date() > maxAge) {
      throw new UnauthorizedException('Verification token has expired');
    }

    return { email: otp.email };
  }

  /**
   * Mark a token as used after successful registration.
   */
  async markTokenUsed(token: string): Promise<void> {
    await this.prisma.emailOtp.updateMany({
      where: { token },
      data: { usedAt: new Date() },
    });
  }

  /**
   * Check if an email is already registered.
   */
  async isEmailRegistered(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    return !!user;
  }
}
