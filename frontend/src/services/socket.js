import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const connectSocket = (token) => {
  if (socket && socket.connected) {
    return socket;
  }

  const authToken = token || localStorage.getItem('token') || localStorage.getItem('adminToken');
  if (!authToken) {
    return null;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token: authToken
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    // console.log('[Socket.IO] Connected to backend server:', socket.id);
  });

  socket.on('connect_error', (err) => {
    // console.warn('[Socket.IO] Connection error:', err.message);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return connectSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
