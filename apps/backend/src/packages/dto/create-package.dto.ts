import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';

export class CreatePackageDto {
  @ApiProperty({ description: 'Package name' })
  name: string;

  @ApiPropertyOptional({ description: 'Package description' })
  description?: string;

  @ApiProperty({ description: 'Price in cents' })
  price: number;

  @ApiPropertyOptional({ description: 'Currency code (default: usd)' })
  currency?: string;

  @ApiProperty({ description: 'Included media types', enum: MediaType, isArray: true })
  mediaTypes: MediaType[];

  @ApiPropertyOptional({ description: 'Turnaround time in days' })
  turnaroundDays?: number;

  @ApiPropertyOptional({ description: 'Number of photos included' })
  photoCount?: number;

  @ApiPropertyOptional({ description: 'Minutes of video included' })
  videoMinutes?: number;

  @ApiPropertyOptional({ description: 'Feature list', type: [String] })
  features?: string[];

  @ApiPropertyOptional({ description: 'Image URLs', type: [String] })
  images?: string[];

  @ApiPropertyOptional({ description: 'Display order' })
  displayOrder?: number;
}

export class UpdatePackageDto {
  @ApiPropertyOptional({ description: 'Package name' })
  name?: string;

  @ApiPropertyOptional({ description: 'Package description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Price in cents' })
  price?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  currency?: string;

  @ApiPropertyOptional({ description: 'Included media types', enum: MediaType, isArray: true })
  mediaTypes?: MediaType[];

  @ApiPropertyOptional({ description: 'Whether package is active' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Turnaround time in days' })
  turnaroundDays?: number;

  @ApiPropertyOptional({ description: 'Number of photos included' })
  photoCount?: number;

  @ApiPropertyOptional({ description: 'Minutes of video included' })
  videoMinutes?: number;

  @ApiPropertyOptional({ description: 'Feature list', type: [String] })
  features?: string[];

  @ApiPropertyOptional({ description: 'Image URLs', type: [String] })
  images?: string[];

  @ApiPropertyOptional({ description: 'Display order' })
  displayOrder?: number;
}
