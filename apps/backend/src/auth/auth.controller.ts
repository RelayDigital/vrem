import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { RegisterDto } from './dto/register.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import { OnboardingRegisterDto } from './dto/onboarding-register.dto';

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
   * Get a Clerk sign-in token for test accounts.
   * In production, only @example.com test accounts are allowed.
   * In development, all accounts are allowed.
   */
  @ApiOperation({ summary: 'Get Clerk sign-in token for test accounts' })
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Public()
  @Post('test-login')
  async testLogin(@Body() body: { email: string; password: string }) {
    // In production, only allow @example.com test accounts
    if (process.env.NODE_ENV === 'production' && !body.email?.endsWith('@example.com')) {
      throw new ForbiddenException('This endpoint is only for test accounts in production');
    }
    return this.authService.getTestAccountSignInToken(body.email, body.password);
  }
}
