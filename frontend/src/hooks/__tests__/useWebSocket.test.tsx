import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWebSocket } from '../useWebSocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string, public protocols?: string | string[]) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Helper methods for testing
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError() {
    this.onerror?.(new Event('error'));
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;

describe('useWebSocket', () => {
  const mockUrl = 'ws://localhost:8000/test';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('initializes with disconnected state', () => {
    const { result } = renderHook(() => useWebSocket(null));
    
    expect(result.current.socket).toBeNull();
    expect(result.current.connectionState).toBe('disconnected');
  });

  it('connects when URL is provided', async () => {
    const { result } = renderHook(() => useWebSocket(mockUrl));
    
    expect(result.current.connectionState).toBe('connecting');
    
    // Wait for connection to open
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    
    expect(result.current.connectionState).toBe('connected');
    expect(result.current.socket).toBeInstanceOf(MockWebSocket);
  });

  it('calls onOpen callback when connection opens', async () => {
    const onOpen = vi.fn();
    
    renderHook(() => useWebSocket(mockUrl, { onOpen }));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('calls onMessage callback when message is received', async () => {
    const onMessage = vi.fn();
    const testMessage = { type: 'test', data: 'hello' };
    
    const { result } = renderHook(() => useWebSocket(mockUrl, { onMessage }));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    
    act(() => {
      (result.current.socket as any).simulateMessage(testMessage);
    });
    
    expect(onMessage).toHaveBeenCalledWith(testMessage);
  });

  it('sends messages when connected', async () => {
    const { result } = renderHook(() => useWebSocket(mockUrl));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    
    const mockSend = vi.spyOn(result.current.socket as any, 'send');
    const testMessage = { type: 'test', data: 'hello' };
    
    act(() => {
      result.current.sendMessage(testMessage);
    });
    
    expect(mockSend).toHaveBeenCalledWith(JSON.stringify(testMessage));
  });

  it('does not send messages when disconnected', () => {
    const { result } = renderHook(() => useWebSocket(null));
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    act(() => {
      result.current.sendMessage({ type: 'test', data: 'hello' });
    });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('WebSocket is not connected')
    );
    
    consoleSpy.mockRestore();
  });

  it('handles connection errors', async () => {
    const onError = vi.fn();
    
    const { result } = renderHook(() => useWebSocket(mockUrl, { onError }));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    
    act(() => {
      (result.current.socket as any).simulateError();
    });
    
    expect(onError).toHaveBeenCalledTimes(1);
    expect(result.current.connectionState).toBe('error');
  });

  it('handles connection close', async () => {
    const onClose = vi.fn();
    
    const { result } = renderHook(() => useWebSocket(mockUrl, { onClose }));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    
    act(() => {
      result.current.socket?.close();
    });
    
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.connectionState).toBe('disconnected');
  });

  it('disconnects manually', async () => {
    const { result } = renderHook(() => useWebSocket(mockUrl));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    
    expect(result.current.connectionState).toBe('connected');
    
    act(() => {
      result.current.disconnect();
    });
    
    expect(result.current.connectionState).toBe('disconnected');
    expect(result.current.socket).toBeNull();
  });

  it('attempts to reconnect on connection loss', async () => {
    vi.useFakeTimers();
    
    const { result } = renderHook(() => 
      useWebSocket(mockUrl, { reconnectAttempts: 2, reconnectInterval: 1000 })
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    
    // Simulate connection loss
    act(() => {
      (result.current.socket as any).readyState = MockWebSocket.CLOSED;
      (result.current.socket as any).onclose?.(new CloseEvent('close'));
    });
    
    expect(result.current.connectionState).toBe('disconnected');
    
    // Fast-forward time to trigger reconnection
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Should attempt to reconnect
    expect(result.current.connectionState).toBe('connecting');
    
    vi.useRealTimers();
  });

  it('handles malformed JSON messages gracefully', async () => {
    const onMessage = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useWebSocket(mockUrl, { onMessage }));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    
    act(() => {
      const mockSocket = result.current.socket as any;
      mockSocket.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));
    });
    
    expect(onMessage).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse WebSocket message')
    );
    
    consoleSpy.mockRestore();
  });
});