import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
