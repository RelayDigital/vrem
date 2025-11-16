import { IsOptional, IsString } from 'class-validator';

export class AssignProjectDto {
  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsString()
  editorId?: string;
}
