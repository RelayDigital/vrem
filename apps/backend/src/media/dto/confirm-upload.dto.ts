import { IsEnum, IsNumber, IsString } from 'class-validator';
import { MediaType } from '@prisma/client';

export class ConfirmUploadDto {
  @IsString()
  projectId: string;

  @IsString()
  key: string;

  @IsString()
  filename: string;

  @IsNumber()
  size: number;

  @IsEnum(MediaType)
  type: MediaType;
}
