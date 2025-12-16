import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AvailabilityStatusDto {
  @IsBoolean()
  isAvailable: boolean;

  @IsOptional()
  @IsString()
  availabilityNote?: string | null;

  @IsOptional()
  @IsBoolean()
  autoDeclineBookings?: boolean;
}
