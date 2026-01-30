import { IsBoolean, IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateNotificationPrefsDto {
  @IsOptional()
  @IsBoolean()
  emailNewOrder?: boolean;

  @IsOptional()
  @IsBoolean()
  emailOrderConfirmed?: boolean;

  @IsOptional()
  @IsBoolean()
  emailProjectAssigned?: boolean;

  @IsOptional()
  @IsBoolean()
  emailStatusChange?: boolean;

  @IsOptional()
  @IsBoolean()
  emailDeliveryReady?: boolean;

  @IsOptional()
  @IsBoolean()
  emailApprovalChange?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNewMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  emailInvoice?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['instant', 'daily', 'off'])
  emailDigestFrequency?: string;
}
