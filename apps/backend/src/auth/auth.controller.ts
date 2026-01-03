import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { RegisterDto } from './dto/register.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import { OnboardingRegisterDto } from './dto/onboarding-register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Rate limit: 3 registrations per minute per IP
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

  // Rate limit: 5 login attempts per minute per IP
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  // Rate limit: 10 OAuth attempts per minute per IP
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

  // Rate limit: 10 OAuth attempts per minute per IP
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

  @Get('me')
  async me(@Req() req: Request & { user: { id: string } }) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Not authenticated');
    }

    return this.authService.me(req.user.id);
  }

  // Rate limit: 3 registrations per minute per IP
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
   * DISABLED in production - only available in development.
   */
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Public()
  @Post('test-login')
  async testLogin(@Body() body: { email: string; password: string }) {
    // Completely disable in production
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('This endpoint is disabled in production');
    }
    return this.authService.getTestAccountSignInToken(body.email, body.password);
  }
}
