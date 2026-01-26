import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddOnCategory } from '@prisma/client';

export class CreateAddOnDto {
  @ApiProperty({ description: 'Add-on name' })
  name: string;

  @ApiPropertyOptional({ description: 'Add-on description' })
  description?: string;

  @ApiProperty({ description: 'Price in cents' })
  price: number;

  @ApiPropertyOptional({ description: 'Currency code (default: usd)' })
  currency?: string;

  @ApiPropertyOptional({ description: 'Add-on category', enum: AddOnCategory })
  category?: AddOnCategory;

  @ApiPropertyOptional({ description: 'Display order' })
  displayOrder?: number;
}

export class UpdateAddOnDto {
  @ApiPropertyOptional({ description: 'Add-on name' })
  name?: string;

  @ApiPropertyOptional({ description: 'Add-on description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Price in cents' })
  price?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  currency?: string;

  @ApiPropertyOptional({ description: 'Add-on category', enum: AddOnCategory })
  category?: AddOnCategory;

  @ApiPropertyOptional({ description: 'Whether add-on is active' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Display order' })
  displayOrder?: number;
}
