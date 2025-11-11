import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; name: string; password: string; role?: Role }) {
    return this.authService.register(
      body.email,
      body.name,
      body.password,
      body.role || Role.AGENT,
    );
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }
}
