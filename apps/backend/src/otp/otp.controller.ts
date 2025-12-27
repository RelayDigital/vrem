import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OtpService } from './otp.service';
import { SendOtpDto, VerifyOtpDto } from './dto';
import { Public } from '../auth/public.decorator';

@Controller('auth/otp')
export class OtpController {
  constructor(private otpService: OtpService) {}

  /**
   * Send an OTP to the provided email address.
   * Rate limited to 3 requests per email per hour.
   */
  @Public()
  @Post('send')
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.email);
  }

  /**
   * Verify an OTP code.
   * Returns a verification token on success.
   */
  @Public()
  @Post('verify')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto.email, dto.code);
  }

  /**
   * Check if an email is already registered.
   */
  @Public()
  @Get('check-email/:email')
  async checkEmail(@Param('email') email: string) {
    const registered = await this.otpService.isEmailRegistered(email);
    return { registered };
  }
}
