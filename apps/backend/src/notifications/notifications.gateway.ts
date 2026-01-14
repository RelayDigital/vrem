import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Logger, Injectable } from '@nestjs/common';

export interface NotificationPayload {
  id: string;
  type: string;
  userId: string;
  orgId?: string;
  projectId?: string;
  title?: string;
  body?: string;
  payload?: Record<string, any>;
  createdAt: Date;
}

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*' },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // Map userId to Set of socket IDs (user can have multiple connections)
  private userSockets = new Map<string, Set<string>>();
  // Map socketId to userId for cleanup
  private socketToUser = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;

    if (!token) {
      this.logger.debug(`Client ${client.id} rejected: no token`);
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true },
      });

      if (!user) {
        this.logger.debug(`Client ${client.id} rejected: user not found`);
        client.disconnect();
        return;
      }

      // Store socket mapping
      client.data.userId = userId;
      this.socketToUser.set(client.id, userId);

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user's personal room for targeted notifications
      await client.join(`user:${userId}`);

      this.logger.debug(`User ${user.name} connected to notifications (socket: ${client.id})`);

      // Send connection confirmation
      client.emit('connected', { userId });
    } catch (error) {
      this.logger.debug(`Client ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);

    if (userId) {
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.socketToUser.delete(client.id);
      this.logger.debug(`User ${userId} disconnected from notifications (socket: ${client.id})`);
    }
  }

  /**
   * Send a notification to a specific user.
   * This is called from NotificationsService when a notification is created.
   */
  sendNotificationToUser(userId: string, notification: NotificationPayload): void {
    const room = `user:${userId}`;
    this.server.to(room).emit('notification', notification);
    this.logger.debug(`Sent notification to user ${userId}: ${notification.type}`);
  }

  /**
   * Send a notification count update to a user.
   * Called when notifications are marked as read or new ones are created.
   */
  sendCountUpdate(userId: string, count: number): void {
    const room = `user:${userId}`;
    this.server.to(room).emit('countUpdate', { count });
  }

  /**
   * Check if a user has any active connections.
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }
}
