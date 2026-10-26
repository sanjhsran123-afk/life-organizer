import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl, getAuthToken } from '../api';

let socketInstance: Socket | null = null;

export function getServerBaseUrl(): string {
  const apiBase = getApiBaseUrl();
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    return apiBase.replace(/\/api$/, '');
  }
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
}

/**
 * Connects or returns existing active Socket.io instance.
 * Automatically attaches authentication token.
 */
export function connectSocket(tokenOverride?: string): Socket {
  const token = tokenOverride || getAuthToken();
  const serverUrl = getServerBaseUrl();

  if (socketInstance) {
    if (socketInstance.connected) {
      return socketInstance;
    }
    // Update auth token in case it changed
    if (token) {
      socketInstance.auth = { token };
      socketInstance.connect();
      return socketInstance;
    }
  }

  socketInstance = io(serverUrl, {
    auth: { token },
    autoConnect: Boolean(token),
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  return socketInstance;
}

export function getSocket(): Socket | null {
  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
