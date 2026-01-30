import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { RegisterDto } from './dto/register.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import { OnboardingRegisterDto } from './dto/onboarding-register.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { CurrentUser } from './current-user.decorator';
import type { AuthenticatedUser } from './auth-context';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new account' })
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Public()
  @Post('register')
  async register(
    @Body() body: RegisterDto,
  ) {
    return this.authService.register(
      body.email,
      body.name,
      body.password,
      body.accountType,
    );
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @ApiOperation({ summary: 'Login or register via Google OAuth' })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Public()
  @Post('oauth/google')
  async oauthGoogle(@Body() body: OAuthLoginDto) {
    return this.authService.oauthLogin('google', {
      token: body.token,
      accountType: body.accountType,
      name: body.name,
    });
  }

  @ApiOperation({ summary: 'Login or register via Facebook OAuth' })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Public()
  @Post('oauth/facebook')
  async oauthFacebook(@Body() body: OAuthLoginDto) {
    return this.authService.oauthLogin('facebook', {
      token: body.token,
      accountType: body.accountType,
      name: body.name,
    });
  }

  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth('bearer')
  @Get('me')
  async me(@Req() req: Request & { user: { id: string } }) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Not authenticated');
    }

    return this.authService.me(req.user.id);
  }

  /**
   * Bootstrap endpoint - ensures user is fully provisioned and returns complete app state.
   * This endpoint is idempotent and should be called on every app load/auth success.
   * It guarantees:
   * - User has a personal org
   * - Returns dbUser, personalOrgId, accessible org contexts, recommended active org
   */
  @ApiOperation({ summary: 'Bootstrap user session — ensures provisioning and returns app state' })
  @ApiBearerAuth('bearer')
  @Get('me/bootstrap')
  async bootstrap(@Req() req: Request & { user: { id: string } }) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Not authenticated');
    }

    return this.authService.bootstrap(req.user.id);
  }

  @ApiOperation({ summary: 'Register via onboarding flow with OTP verification' })
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Public()
  @Post('register/onboarding')
  async registerOnboarding(@Body() body: OnboardingRegisterDto) {
    return this.authService.registerFromOnboarding({
      otpToken: body.otpToken,
      email: body.email,
      name: body.name,
      password: body.password,
      accountType: body.accountType,
      inviteCode: body.inviteCode,
      useCases: body.useCases,
    });
  }

  /**
   * Complete onboarding for SSO-provisioned users.
   * Sets the user's chosen account type and marks onboarding as complete.
   */
  @ApiOperation({ summary: 'Complete SSO onboarding — set account type' })
  @ApiBearerAuth('bearer')
  @Post('complete-onboarding')
  async completeOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CompleteOnboardingDto,
  ) {
    return this.authService.completeOnboarding(
      user.id,
      body.accountType,
      body.useCases,
    );
  }

}
