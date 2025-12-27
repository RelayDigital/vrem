import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AuthorizationService } from './authorization.service';
import { OrgContextGuard } from './org-context.guard';
import { OrgRolesGuard } from './org-roles.guard';
import { OtpModule } from '../otp/otp.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_auth_key',
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
