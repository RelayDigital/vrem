import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateProjectDto {
  @IsOptional()
  @IsString()
  agentId: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  scheduledTime: string;
}
