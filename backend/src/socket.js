const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Allows frontend development connections
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid socket authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    if (!user) return;

    // Every user joins their personal user room for direct messaging and alerts
    const userRoom = `user_${user.id}`;
    socket.join(userRoom);

    // If admin, also join admin room for real-time dashboard events
    if (user.role === 'admin') {
      socket.join('admin_room');
    }

    // Typing indicators between connected users
    socket.on('typing_start', ({ recipientId }) => {
      if (recipientId) {
        emitToUser(recipientId, 'user_typing', { senderId: user.id, isTyping: true });
      }
    });

    socket.on('typing_stop', ({ recipientId }) => {
      if (recipientId) {
        emitToUser(recipientId, 'user_typing', { senderId: user.id, isTyping: false });
      }
    });

    socket.on('disconnect', () => {
      // Socket disconnected
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return io;
}

// Helper to emit events to admin dashboard
function emitToAdmin(event, payload) {
  if (io) {
    io.to('admin_room').emit(event, {
      ...payload,
      timestamp: new Date().toISOString()
    });
  }
}

// Helper to emit events to a specific user
function emitToUser(userId, event, payload) {
  if (io) {
    io.to(`user_${userId}`).emit(event, payload);
  }
}

// Helper to disconnect all active socket connections for a blocked user
function disconnectUserSockets(userId) {
  if (io) {
    const userRoom = `user_${userId}`;
    io.to(userRoom).emit('account_blocked', {
      message: 'Your account has been temporarily restricted by an administrator.'
    });

    const room = io.sockets.adapter.rooms.get(userRoom);
    if (room) {
      for (const socketId of Array.from(room)) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }
    }
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToAdmin,
  emitToUser,
  disconnectUserSockets
};
