import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { RegisterDto } from './dto/register.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import { OnboardingRegisterDto } from './dto/onboarding-register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('oauth/google')
  async oauthGoogle(@Body() body: OAuthLoginDto) {
    return this.authService.oauthLogin('google', {
      token: body.token,
      accountType: body.accountType,
      name: body.name,
    });
  }

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
   * This bypasses Clerk's email verification requirement.
   * Only works for @example.com emails in non-production.
   */
  @Public()
  @Post('test-login')
  async testLogin(@Body() body: { email: string; password: string }) {
    return this.authService.getTestAccountSignInToken(body.email, body.password);
  }
}
