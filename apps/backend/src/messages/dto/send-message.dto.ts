import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectChatChannel } from '@prisma/client';

export class SendMessageDto {
  @IsString()
  projectId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(ProjectChatChannel)
  channel?: ProjectChatChannel;

  @IsOptional()
  @IsString()
  thread?: string | null;
}
