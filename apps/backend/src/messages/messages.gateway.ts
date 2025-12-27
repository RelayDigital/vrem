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
import { Logger } from '@nestjs/common';

interface TypingUserInfo {
  userName: string;
  timeout: NodeJS.Timeout;
}

interface UserSocketInfo {
  userId: string;
  userName: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  // Typing state: Map<`${projectId}:${channel}`, Map<userId, TypingUserInfo>>
  private typingUsers = new Map<string, Map<string, TypingUserInfo>>();

  // Presence state
  private onlineUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private userSocketMap = new Map<string, UserSocketInfo>(); // socketId -> user info
  private userProjectRooms = new Map<string, Set<string>>(); // socketId -> Set<projectId>

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

      // Store AuthenticatedUser in socket data
      const authenticatedUser: AuthenticatedUser = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        accountType: dbUser.accountType,
        personalOrgId: personalOrg?.orgId || null,
      };

      client.data.user = authenticatedUser;

      // Track socket-to-user mapping for presence
      this.userSocketMap.set(client.id, {
        userId: dbUser.id,
        userName: dbUser.name,
      });

      // Track user as online
      if (!this.onlineUsers.has(dbUser.id)) {
        this.onlineUsers.set(dbUser.id, new Set());
      }
      this.onlineUsers.get(dbUser.id)!.add(client.id);

      this.logger.debug(`User ${dbUser.name} connected (socket: ${client.id})`);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userInfo = this.userSocketMap.get(client.id);
    if (!userInfo) return;

    const { userId, userName } = userInfo;

    // Remove socket from user's set
    const userSockets = this.onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(client.id);

      // If user has no more sockets, they're offline
      if (userSockets.size === 0) {
        this.onlineUsers.delete(userId);

        // Notify all rooms this socket was in
        const rooms = this.userProjectRooms.get(client.id) || new Set();
        for (const projectId of rooms) {
          this.server.to(`project:${projectId}`).emit('presenceUpdate', {
            userId,
            userName,
            isOnline: false,
            projectId,
          });
        }
      }
    }

    // Clear typing indicators for this user
    for (const [roomKey, roomTyping] of this.typingUsers.entries()) {
      if (roomTyping.has(userId)) {
        this.clearUserTyping(roomKey, userId);
        const [projectId, channel] = roomKey.split(':');
        this.server.to(`project:${projectId}`).emit('userTyping', {
          projectId,
          channel,
          userId,
          userName,
          isTyping: false,
        });
      }
    }

    // Clean up maps
    this.userSocketMap.delete(client.id);
    this.userProjectRooms.delete(client.id);

    this.logger.debug(`User ${userName} disconnected (socket: ${client.id})`);
  }

  @SubscribeMessage('joinProject')
  async handleJoinProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthenticatedUser;
    if (!user) return { error: 'Not authenticated' };

    const allowed = await this.messagesService.userHasAccessToProject(
      user,
      data.projectId,
    );

    if (!allowed) {
      return { error: 'Access denied' };
    }

    const room = `project:${data.projectId}`;
    await client.join(room);

    // Track which projects this socket is in
    if (!this.userProjectRooms.has(client.id)) {
      this.userProjectRooms.set(client.id, new Set());
    }
    this.userProjectRooms.get(client.id)!.add(data.projectId);

    // Notify others in the room that user joined
    client.to(room).emit('presenceUpdate', {
      userId: user.id,
      userName: user.name,
      isOnline: true,
      projectId: data.projectId,
    });

    // Send current presence list to joining user
    const presenceList = await this.getProjectPresence(data.projectId);
    client.emit('presenceList', {
      projectId: data.projectId,
      users: presenceList,
    });

    return { joined: room };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { projectId: string; content: string; channel?: string; thread?: string | null },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthenticatedUser;
    if (!user) return { error: 'Not authenticated' };

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

    const channel = normalizedChannel === 'customer' ? 'CUSTOMER' : 'TEAM';

    const message = await this.messagesService.sendMessageWithOrg(user, {
      projectId: data.projectId,
      content: data.content,
      channel: channel as any,
      thread: data.thread,
    });

    // Clear typing indicator when message is sent
    const roomKey = `${data.projectId}:${channel}`;
    if (this.typingUsers.get(roomKey)?.has(user.id)) {
      this.clearUserTyping(roomKey, user.id);
      this.server.to(`project:${data.projectId}`).emit('userTyping', {
        projectId: data.projectId,
        channel,
        userId: user.id,
        userName: user.name,
        isTyping: false,
      });
    }

    const room = `project:${data.projectId}`;
    this.server.to(room).emit('messageCreated', message);

    return message;
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { projectId: string; channel: 'TEAM' | 'CUSTOMER'; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthenticatedUser;
    if (!user) return { error: 'Not authenticated' };

    const normalizedChannel = data.channel === 'CUSTOMER' ? 'customer' : 'team';
    const allowed = await this.messagesService.userHasAccessToProject(
      user,
      data.projectId,
      normalizedChannel,
    );

    if (!allowed) return { error: 'Access denied' };

    const roomKey = `${data.projectId}:${data.channel}`;
    const room = `project:${data.projectId}`;

    if (data.isTyping) {
      this.setUserTyping(roomKey, user.id, user.name, data.projectId, data.channel);
    } else {
      this.clearUserTyping(roomKey, user.id);
    }

    // Broadcast to room (excluding sender)
    client.to(room).emit('userTyping', {
      projectId: data.projectId,
      channel: data.channel,
      userId: user.id,
      userName: user.name,
      isTyping: data.isTyping,
    });

    return { success: true };
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @MessageBody() data: { messageIds: string[]; projectId: string; channel: 'TEAM' | 'CUSTOMER' },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthenticatedUser;
    if (!user) return { error: 'Not authenticated' };

    if (!data.messageIds || data.messageIds.length === 0) {
      return { success: true, markedCount: 0 };
    }

    const normalizedChannel = data.channel === 'CUSTOMER' ? 'customer' : 'team';
    const allowed = await this.messagesService.userHasAccessToProject(
      user,
      data.projectId,
      normalizedChannel,
    );

    if (!allowed) return { error: 'Access denied' };

    const result = await this.messagesService.markMessagesAsRead(
      user.id,
      user.name,
      data.messageIds,
      data.projectId,
      data.channel,
    );

    if (result.messageIds.length > 0) {
      const room = `project:${data.projectId}`;
      this.server.to(room).emit('messagesRead', {
        messageIds: result.messageIds,
        readBy: { userId: result.userId, userName: result.userName },
        readAt: result.readAt.toISOString(),
      });
    }

    return { success: true, markedCount: result.messageIds.length };
  }

  private setUserTyping(
    roomKey: string,
    userId: string,
    userName: string,
    projectId: string,
    channel: string,
  ) {
    if (!this.typingUsers.has(roomKey)) {
      this.typingUsers.set(roomKey, new Map());
    }

    const roomTyping = this.typingUsers.get(roomKey)!;

    // Clear existing timeout if present
    const existing = roomTyping.get(userId);
    if (existing?.timeout) {
      clearTimeout(existing.timeout);
    }

    // Set auto-clear timeout (5 seconds)
    const timeout = setTimeout(() => {
      this.clearUserTyping(roomKey, userId);
      this.server.to(`project:${projectId}`).emit('userTyping', {
        projectId,
        channel,
        userId,
        userName,
        isTyping: false,
      });
    }, 5000);

    roomTyping.set(userId, { userName, timeout });
  }

  private clearUserTyping(roomKey: string, userId: string) {
    const roomTyping = this.typingUsers.get(roomKey);
    if (!roomTyping) return;

    const existing = roomTyping.get(userId);
    if (existing?.timeout) {
      clearTimeout(existing.timeout);
    }
    roomTyping.delete(userId);

    if (roomTyping.size === 0) {
      this.typingUsers.delete(roomKey);
    }
  }

  private async getProjectPresence(projectId: string): Promise<{ userId: string; userName: string; isOnline: boolean }[]> {
    const room = `project:${projectId}`;
    const socketsInRoom = await this.server.in(room).fetchSockets();

    const presenceMap = new Map<string, { userName: string; isOnline: boolean }>();

    for (const socket of socketsInRoom) {
      const userInfo = this.userSocketMap.get(socket.id);
      if (userInfo && !presenceMap.has(userInfo.userId)) {
        presenceMap.set(userInfo.userId, {
          userName: userInfo.userName,
          isOnline: true,
        });
      }
    }

    return Array.from(presenceMap.entries()).map(([userId, info]) => ({
      userId,
      ...info,
    }));
  }
}
