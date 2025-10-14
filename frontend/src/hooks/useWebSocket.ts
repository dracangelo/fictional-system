import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

export interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  protocols?: string | string[];
}

export interface UseWebSocketReturn {
  socket: WebSocket | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  sendMessage: (message: WebSocketMessage) => void;
  connect: () => void;
  disconnect: () => void;
}

export const useWebSocket = (
  url: string | null,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectAttempts = 3,
    reconnectInterval = 3000,
    protocols
  } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    if (!url || socket?.readyState === WebSocket.CONNECTING || socket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionState('connecting');
      const ws = new WebSocket(url, protocols);

      ws.onopen = (event) => {
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        onOpen?.(event);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        setConnectionState('disconnected');
        setSocket(null);
        onClose?.(event);

        // Attempt to reconnect if not manually closed and attempts remaining
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (event) => {
        setConnectionState('error');
        onError?.(event);
      };

      setSocket(ws);
    } catch (error) {
      setConnectionState('error');
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, protocols, onMessage, onOpen, onClose, onError, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    
    setSocket(null);
    setConnectionState('disconnected');
  }, [socket]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
      }
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, [socket]);

  useEffect(() => {
    if (url) {
      shouldReconnectRef.current = true;
      connect();
    }

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [url, connect]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    socket,
    connectionState,
    sendMessage,
    connect,
    disconnect
  };
};