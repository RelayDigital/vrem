import { IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  projectId: string;

  @IsString()
  content: string;
}
