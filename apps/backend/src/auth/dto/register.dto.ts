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
   * COMPANY will be stored as AGENT with a pending company request.
   */
  @IsEnum(UserAccountType)
  accountType: UserAccountType;

  @IsOptional()
  @IsString()
  companyRequestNote?: string;
}
