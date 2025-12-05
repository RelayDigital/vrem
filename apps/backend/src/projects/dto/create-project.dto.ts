import { IsString, IsOptional, IsDateString, ValidateNested, IsObject, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  street_number?: string;

  @IsOptional()
  @IsString()
  street_name?: string;

  @IsOptional()
  @IsString()
  unit_number?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state_or_province?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  unparsed_address?: string;
}

export class CreateProjectDto {
  @ValidateNested()
  @Type(() => AddressDto)
  @IsObject()
  address: AddressDto | Record<string, any> | string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  scheduledTime: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  projectManagerId?: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsString()
  editorId?: string;
}
