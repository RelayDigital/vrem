import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserAccountType } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(UserAccountType)
  accountType?: UserAccountType;
}
