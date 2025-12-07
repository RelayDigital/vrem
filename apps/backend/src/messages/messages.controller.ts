import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OrgContextGuard } from '../auth/org-context.guard';
import type { AuthenticatedUser, OrgContext } from '../auth/auth-context';
import { ProjectChatChannel } from '@prisma/client';

@Controller('messages')
@UseGuards(JwtAuthGuard, OrgContextGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req,
    @Body() dto: SendMessageDto,
  ) {
    const ctx = req.orgContext as OrgContext;
    return this.messagesService.sendMessage(ctx, user, dto);
  }

  @Get('project/:projectId')
  async getMessagesForProject(
    @Param('projectId') projectId: string,
    @Req() req,
    @Query('channel') channel?: ProjectChatChannel,
  ) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.messagesService.getMessagesForProject(
      ctx,
      user,
      projectId,
      channel,
    );
  }

  @Get(':id')
  async getMessageById(@Param('id') id: string, @Req() req) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.messagesService.getMessageById(ctx, user, id);
  }

  @Delete(':id')
  async deleteMessage(
    @Param('id') id: string,
    @Req() req,
  ) {
    const ctx = req.orgContext as OrgContext;
    const user = req.user as AuthenticatedUser;
    return this.messagesService.deleteMessage(id, ctx, user);
  }
}
