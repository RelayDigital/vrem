import { IsString } from 'class-validator';
import { CreateProjectMediaDto } from './create-project-media.dto';

export class ConfirmUploadDto extends CreateProjectMediaDto {
  @IsString()
  projectId: string;
}
