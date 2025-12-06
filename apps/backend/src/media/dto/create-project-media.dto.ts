import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { MediaType } from '@prisma/client';

export class CreateProjectMediaDto {
  @IsString()
  key: string;

  @IsOptional()
  @IsString()
  cdnUrl?: string;

  @IsString()
  filename: string;

  @IsNumber()
  size: number;

  @IsEnum(MediaType)
  type: MediaType;
}
