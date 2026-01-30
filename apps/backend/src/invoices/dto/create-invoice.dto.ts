import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceLineItemDto {
  @IsString()
  description: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number; // In cents

  @IsOptional()
  @IsNumber()
  total?: number; // In cents (auto-calculated if not provided)
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  items: InvoiceLineItemDto[];

  @IsOptional()
  @IsNumber()
  taxRate?: number; // e.g. 0.13 for 13%

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  items?: InvoiceLineItemDto[];

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
