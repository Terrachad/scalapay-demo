import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';

class WebSocketService {
  private socket: Socket | null = null;

  connect() {
    const token = useAuthStore.getState().token;

    if (!token) {
      console.error('No auth token available');
      return;
    }

    this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      auth: {
        token,
      },
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToAnalytics(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.emit('subscribe:analytics');
    this.socket.on('analytics:update', callback);
  }

  subscribeToTransactions(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.on('transaction:update', callback);
  }

  unsubscribe(event: string) {
    if (!this.socket) return;
    this.socket.off(event);
  }
}

export const wsService = new WebSocketService();
