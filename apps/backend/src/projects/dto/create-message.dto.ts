import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectChatChannel } from '@prisma/client';

export class CreateMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(ProjectChatChannel)
  channel?: ProjectChatChannel;

  @IsOptional()
  @IsString()
  thread?: string | null;
}
