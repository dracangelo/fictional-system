import { io, Socket } from 'socket.io-client';
import { RealTimeEvent } from '../../types/notification';

export class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(private url: string, private authToken?: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(this.url, {
        auth: {
          token: this.authToken
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('Socket.IO connected');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, reconnect manually
          this.handleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        this.handleReconnect();
        reject(error);
      });

      // Handle real-time events
      this.socket.on('real_time_event', (event: RealTimeEvent) => {
        this.handleRealTimeEvent(event);
      });

      // Handle specific event types
      this.socket.on('seat_update', (data) => {
        this.emit('seat_update', data);
      });

      this.socket.on('booking_update', (data) => {
        this.emit('booking_update', data);
      });

      this.socket.on('system_announcement', (data) => {
        this.emit('system_announcement', data);
      });

      this.socket.on('user_notification', (data) => {
        this.emit('user_notification', data);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect().catch(console.error);
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private handleRealTimeEvent(event: RealTimeEvent): void {
    this.emit(event.type, event.data);
  }

  // Subscribe to events
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  // Emit events to listeners
  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Send message to server
  send(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot send message:', { event, data });
    }
  }

  // Join a room (for event-specific updates)
  joinRoom(roomId: string): void {
    this.send('join_room', { roomId });
  }

  // Leave a room
  leaveRoom(roomId: string): void {
    this.send('leave_room', { roomId });
  }

  // Get connection status
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Update auth token
  updateAuthToken(token: string): void {
    this.authToken = token;
    if (this.socket) {
      this.socket.auth = { token };
    }
  }
}

// Singleton instance
let socketService: SocketService | null = null;

export const getSocketService = (url?: string, authToken?: string): SocketService => {
  if (!socketService && url) {
    socketService = new SocketService(url, authToken);
  } else if (socketService && authToken) {
    socketService.updateAuthToken(authToken);
  }
  
  return socketService!;
};

export const disconnectSocket = (): void => {
  if (socketService) {
    socketService.disconnect();
    socketService = null;
  }
};