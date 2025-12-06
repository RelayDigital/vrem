import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService, // ← INJECT JWT SERVICE
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token); // ← USE JWT SERVICE

      const rawRole =
        payload.accountType ||
        payload.account_type ||
        payload.role ||
        payload.account_type;
      const roleUpper = (rawRole || '').toUpperCase();
      const accountType =
        roleUpper === 'AGENT'
          ? 'AGENT'
          : ['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'DISPATCHER', 'COMPANY'].includes(
              roleUpper,
            )
          ? 'COMPANY'
          : ['TECHNICIAN', 'PROVIDER', 'EDITOR'].includes(roleUpper)
          ? 'PROVIDER'
          : 'PROVIDER'; // default to provider for unrecognized roles

      client.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        accountType,
        name: payload.name,
      };
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {}

  @SubscribeMessage('joinProject')
  async handleJoinProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    const allowed = await this.messagesService.userHasAccessToProject({
      userId: user.id,
      accountType: (user.accountType || user.role) as any,
      projectId: data.projectId,
    });

    if (!allowed) {
      return { error: 'Access denied' };
    }

    const room = `project:${data.projectId}`;
    await client.join(room);

    return { joined: room };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { projectId: string; content: string; channel?: string; thread?: string | null },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    const allowed = await this.messagesService.userHasAccessToProject({
      userId: user.id,
      accountType: (user.accountType || user.role) as any,
      projectId: data.projectId,
    });

    if (!allowed) {
      return { error: 'Access denied' };
    }

    const channel =
      data.channel && data.channel.toUpperCase() === 'CUSTOMER'
        ? 'CUSTOMER'
        : 'TEAM';

    const message = await this.messagesService.sendMessage(user.id, {
      projectId: data.projectId,
      content: data.content,
      channel: channel as any,
      thread: data.thread,
    });

    const room = `project:${data.projectId}`;
    this.server.to(room).emit('messageCreated', message);

    return message;
  }
}
