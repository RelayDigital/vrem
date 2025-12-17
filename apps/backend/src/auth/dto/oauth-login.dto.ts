import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserAccountType } from '@prisma/client';

export class OAuthLoginDto {
  @IsString()
  token: string; // Google ID token or Facebook access token

  @IsEnum(UserAccountType)
  accountType: UserAccountType;

  @IsOptional()
  @IsString()
  name?: string; // optional override if provider profile lacks a name

  @IsOptional()
  @IsString()
  companyRequestNote?: string;
}
