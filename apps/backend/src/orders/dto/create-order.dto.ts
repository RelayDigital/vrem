import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  IsEnum,
  ValidateNested,
  IsEmail,
  ValidateIf,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NewCustomerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export enum OrderPriority {
  STANDARD = 'standard',
  RUSH = 'rush',
  URGENT = 'urgent',
}

export class CreateOrderDto {
  // Provider organization (for agent flow)
  // When set, the order is created for this COMPANY org and the agent becomes the customer
  @IsOptional()
  @IsString()
  providerOrgId?: string;

  // Customer - one of these required (for company internal flow)
  // When providerOrgId is set, these are ignored as the agent becomes the customer
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewCustomerDto)
  newCustomer?: NewCustomerDto;

  // Address
  @IsString()
  addressLine1: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  // Scheduling
  @IsDateString()
  scheduledTime: string;

  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  // Service details
  @IsArray()
  @IsString({ each: true })
  mediaTypes: string[];

  @IsEnum(OrderPriority)
  priority: OrderPriority;

  @IsOptional()
  @IsString()
  notes?: string;

  // Assignment (optional)
  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsString()
  editorId?: string;

  @IsOptional()
  @IsString()
  projectManagerId?: string;

  // Package selection (for agent checkout flow)
  @IsOptional()
  @IsString()
  packageId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addOnIds?: string[];

  // Add-on quantities (optional, defaults to 1 for each add-on)
  @IsOptional()
  @IsObject()
  addOnQuantities?: Record<string, number>;
}

