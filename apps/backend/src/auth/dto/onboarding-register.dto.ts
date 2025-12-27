import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
} from 'class-validator';
import { UserAccountType, ProviderUseCaseType } from '@prisma/client';

export class OnboardingRegisterDto {
  @IsString()
  otpToken: string;

  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserAccountType)
  accountType: UserAccountType;

  @IsOptional()
  @IsString()
  inviteCode?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ProviderUseCaseType, { each: true })
  useCases?: ProviderUseCaseType[];
}
