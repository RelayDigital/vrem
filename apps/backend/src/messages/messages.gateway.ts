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
import { PrismaService } from '../prisma/prisma.service';
import { OrgType } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth-context';

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
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token);

      // Fetch full user data from database to build AuthenticatedUser
      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          accountType: true,
        },
      });

      if (!dbUser) {
        client.disconnect();
        return;
      }

      // Find user's personal org
      const personalOrg = await this.prisma.organizationMember.findFirst({
        where: { userId: dbUser.id, organization: { type: OrgType.PERSONAL } },
        select: { orgId: true },
        orderBy: { createdAt: 'asc' },
      });

      // Store AuthenticatedUser in socket data - no accountType derivation needed
      // Authorization is handled by MessagesService using org membership roles
      const authenticatedUser: AuthenticatedUser = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        accountType: dbUser.accountType,
        personalOrgId: personalOrg?.orgId || null,
      };

      client.data.user = authenticatedUser;
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

    const allowed = await this.messagesService.userHasAccessToProject(
      user,
      data.projectId,
    );

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

    const normalizedChannel =
      data.channel && data.channel.toUpperCase() === 'CUSTOMER'
        ? 'customer'
        : 'team';
    const allowed = await this.messagesService.userHasAccessToProject(
      user,
      data.projectId,
      normalizedChannel,
    );

    if (!allowed) {
      return { error: 'Access denied' };
    }

    const channel =
      normalizedChannel === 'customer' ? 'CUSTOMER' : 'TEAM';

    const message = await this.messagesService.sendMessageWithOrg(user, {
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
