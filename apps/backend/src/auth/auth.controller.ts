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
}
