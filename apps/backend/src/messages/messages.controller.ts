import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Role } from '@prisma/client';

type CurrentUserType = {
  id: string;
  role: Role;
};

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async sendMessage(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(user.id, dto);
  }

  @Get('project/:projectId')
  async getMessagesForProject(@Param('projectId') projectId: string) {
    return this.messagesService.getMessagesForProject(projectId);
  }

  @Get(':id')
  async getMessageById(@Param('id') id: string) {
    return this.messagesService.getMessageById(id);
  }

  // maybe dont need it yet
  // @Delete(':id')
  // async deleteMessage(
  //   @Param('id') id: string,
  //   @CurrentUser() user: CurrentUserType,
  // ) {
  //   return this.messagesService.deleteMessage(id, user);
  // }
}
