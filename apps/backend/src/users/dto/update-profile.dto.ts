import { IsOptional, IsString, IsUrl } from 'class-validator';

/**
 * DTO for self-service profile updates
 * Users can only update their own name and avatar
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
