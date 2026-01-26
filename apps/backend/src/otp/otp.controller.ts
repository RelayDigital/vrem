import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OtpService } from './otp.service';
import { SendOtpDto, VerifyOtpDto } from './dto';
import { Public } from '../auth/public.decorator';

@ApiTags('OTP')
@Controller('auth/otp')
export class OtpController {
  constructor(private otpService: OtpService) {}

  @ApiOperation({ summary: 'Send OTP to email address' })
  @Public()
  @Post('send')
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.email);
  }

  @ApiOperation({ summary: 'Verify OTP code' })
  @Public()
  @Post('verify')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto.email, dto.code);
  }

  @ApiOperation({ summary: 'Check if email is registered' })
  @Public()
  @Get('check-email/:email')
  async checkEmail(@Param('email') email: string) {
    const registered = await this.otpService.isEmailRegistered(email);
    return { registered };
  }
}
