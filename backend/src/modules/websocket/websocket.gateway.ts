import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ScalaPayWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger = new Logger('ScalaPayWebSocketGateway');

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      // Join user to their personal room
      client.join(`user:${payload.sub}`);

      // Join role-based room
      client.join(`role:${payload.role}`);

      this.logger.log(`Client connected: ${client.id} - User: ${payload.sub}`);
    } catch (error: any) {
      this.logger.error(`Connection rejected: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:analytics')
  handleSubscribeAnalytics(@ConnectedSocket() client: Socket) {
    if (client.data.role === 'merchant' || client.data.role === 'admin') {
      client.join('analytics');
      return { event: 'subscribed', data: 'analytics' };
    }
  }

  // Method to emit transaction updates
  emitTransactionUpdate(userId: string, transaction: any) {
    this.server.to(`user:${userId}`).emit('transaction:update', transaction);
  }

  // Method to emit analytics updates
  emitAnalyticsUpdate(data: any) {
    this.server.to('analytics').emit('analytics:update', data);
  }
}
