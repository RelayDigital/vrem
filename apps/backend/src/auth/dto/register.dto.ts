import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserAccountType } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  @MinLength(6)
  password: string;

  /**
   * User-facing intent for the account.
   * Only AGENT and PROVIDER are user-facing in the UI.
   */
  @IsEnum(UserAccountType)
  accountType: UserAccountType;
}
