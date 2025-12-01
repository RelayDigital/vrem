import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateProjectDto {
  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  orgId?: string; // For agents who may not be org members, they can provide orgId in body

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  scheduledTime: string;

  @IsOptional()
  @IsString()
  customerId?: string;
}
