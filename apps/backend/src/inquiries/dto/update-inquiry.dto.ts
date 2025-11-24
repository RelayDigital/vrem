import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InquiryStatus } from '@prisma/client';

export class UpdateInquiryDto {
  @IsOptional()
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;
}
