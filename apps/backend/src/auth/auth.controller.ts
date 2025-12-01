import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() body: { email: string; name: string; password: string; role: Role },
  ) {
    return this.authService.register(
      body.email,
      body.name,
      body.password,
      body.role,
    );
  }

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Get('me')
  async me(@Req() req: Request & { user: { id: string } }) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Not authenticated');
    }

    return this.authService.me(req.user.id);
  }
}
