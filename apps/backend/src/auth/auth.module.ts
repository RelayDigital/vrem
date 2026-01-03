import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AuthorizationService } from './authorization.service';
import { OrgContextGuard } from './org-context.guard';
import { OrgRolesGuard } from './org-roles.guard';
import { OtpModule } from '../otp/otp.module';

// JWT secret resolution with production safety check
function getJwtSecret(): string {
  const logger = new Logger('AuthModule');
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      // This should never happen due to env validation in main.ts,
      // but adding as defense in depth
      throw new Error('JWT_SECRET must be set in production');
    }
    logger.warn('JWT_SECRET not set - using insecure default. Set it before deploying to production.');
    return 'dev_auth_key_INSECURE';
  }

  return secret;
}

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
    OtpModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AuthorizationService,
    OrgContextGuard,
    OrgRolesGuard,
  ],
  exports: [
    AuthService,
    JwtModule,
    AuthorizationService,
    OrgContextGuard,
    OrgRolesGuard,
  ],
})
export class AuthModule {}
