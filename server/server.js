// server/server.js - FIXED VERSION
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e8,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve built client files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // Catch all handler: send back React's index.html file for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Store connected users, messages, and rooms
const users = {};
const messages = [];
const typingUsers = {};
const messageReactions = {}; // Store reactions: { messageId: { emoji: [usernames] } }
const rooms = {
  global: { 
    id: 'global', 
    name: 'Global Chat', 
    members: new Set(),
    createdAt: new Date().toISOString()
  },
  tech: { 
    id: 'tech', 
    name: 'Tech Talk', 
    members: new Set(),
    createdAt: new Date().toISOString()
  },
  random: { 
    id: 'random', 
    name: 'Random', 
    members: new Set(),
    createdAt: new Date().toISOString()
  }
};

// Debounce tracker for rapid connects/disconnects
const connectionDebounce = {};
const userJoinDebounce = {}; // Track user join attempts to prevent spam
const socketCleanupTimers = {}; // Track cleanup timers per socket

// Helper functions
const getUserList = () => Object.values(users);

const getRoomList = () => {
  return Object.values(rooms).map(room => ({
    id: room.id,
    name: room.name,
    memberCount: room.members.size,
  }));
};

const cleanupUser = (socketId) => {
  const user = users[socketId];
  if (user) {
    // Remove from current room
    if (user.currentRoom && rooms[user.currentRoom]) {
      rooms[user.currentRoom].members.delete(socketId);
    }
    
    // Remove from users and typing
    delete users[socketId];
    delete typingUsers[socketId];
    
    return user;
  }
  return null;
};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // Clear any debounce timeout for this socket
  if (connectionDebounce[socket.id]) {
    clearTimeout(connectionDebounce[socket.id]);
    delete connectionDebounce[socket.id];
  }

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`❌ Socket ${socket.id} error:`, error);
  });

  // Handle connect_error
  socket.on('connect_error', (error) => {
    console.error(`❌ Socket ${socket.id} connect error:`, error.message);
  });

  // Clear any existing cleanup timer for this socket
  if (socketCleanupTimers[socket.id]) {
    clearTimeout(socketCleanupTimers[socket.id]);
    delete socketCleanupTimers[socket.id];
  }

  // Handle user joining
  socket.on('user_join', (username) => {
    console.log(`👤 User joining: ${username}`);

    // Debounce user join attempts to prevent spam - increased timeout
    const now = Date.now();
    if (userJoinDebounce[username] && now - userJoinDebounce[username] < 2000) {
      console.log(`⚠️ User ${username} join attempt too soon, debouncing...`);
      return;
    }
    userJoinDebounce[username] = now;

    // Check if user already exists (reconnection)
    const existingUser = Object.values(users).find(u => u.username === username);
    if (existingUser && existingUser.id !== socket.id) {
      console.log(`⚠️ User ${username} already connected, cleaning up old connection`);
      cleanupUser(existingUser.id);
    }

    users[socket.id] = {
      username,
      id: socket.id,
      joinedAt: new Date().toISOString(),
      currentRoom: 'global',
      email: username // Will be updated if email is sent
    };

    // Join default room silently (no notification for initial join)
    socket.join('global');
    rooms.global.members.add(socket.id);

    // Send current state to new user only
    socket.emit('user_list', getUserList());
    socket.emit('rooms_list', getRoomList());
    socket.emit('message_history', messages.filter(m => m.roomId === 'global').slice(-50));

    // Notify OTHER users (not the joining user) - ONLY ONCE
    socket.broadcast.emit('user_list', getUserList());
    socket.broadcast.emit('user_joined', { username, id: socket.id });

    console.log(`✅ ${username} joined. Total users: ${Object.keys(users).length}`);
  });

  // Handle chat messages
  socket.on('send_message', (messageData) => {
    const user = users[socket.id];
    if (!user) {
      console.log('⚠️ Message from unknown user');
      return;
    }

    const roomId = messageData.roomId || user.currentRoom || 'global';
    
    const message = {
      id: `msg_${Date.now()}_${socket.id}`,
      message: messageData.message,
      sender: user.username,
      senderId: socket.id,
      timestamp: new Date().toISOString(),
      roomId: roomId,
      type: messageData.type || 'text',
      reactions: {}, // Initialize empty reactions
    };
    
    messages.push(message);
    messageReactions[message.id] = {};
    
    // Limit stored messages
    if (messages.length > 500) {
      const removedMsg = messages.shift();
      delete messageReactions[removedMsg.id];
    }
    
    // Emit to room (including sender)
    io.to(roomId).emit('receive_message', message);
    
    console.log(`💬 ${user.username} -> ${roomId}: ${message.message.substring(0, 50)}`);
  });

  // Handle message reactions
  socket.on('add_reaction', ({ messageId, emoji }) => {
    const user = users[socket.id];
    if (!user) return;

    if (!messageReactions[messageId]) {
      messageReactions[messageId] = {};
    }

    if (!messageReactions[messageId][emoji]) {
      messageReactions[messageId][emoji] = [];
    }

    // Toggle reaction
    const userIndex = messageReactions[messageId][emoji].indexOf(user.username);
    if (userIndex > -1) {
      // Remove reaction
      messageReactions[messageId][emoji].splice(userIndex, 1);
      if (messageReactions[messageId][emoji].length === 0) {
        delete messageReactions[messageId][emoji];
      }
    } else {
      // Add reaction
      messageReactions[messageId][emoji].push(user.username);
    }

    // Find the message and update it
    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.reactions = messageReactions[messageId];
      
      // Broadcast updated reactions to the room
      io.to(message.roomId).emit('message_reaction', {
        messageId,
        reactions: messageReactions[messageId]
      });
    }

    console.log(`👍 ${user.username} reacted ${emoji} to message ${messageId}`);
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    const user = users[socket.id];
    if (!user) return;
    
    const roomId = user.currentRoom || 'global';
    
    if (isTyping) {
      typingUsers[socket.id] = user.username;
    } else {
      delete typingUsers[socket.id];
    }
    
    // Get typing users in current room only
    const roomMembers = rooms[roomId]?.members || new Set();
    const roomTypingUsers = Object.entries(typingUsers)
      .filter(([socketId]) => roomMembers.has(socketId))
      .map(([, username]) => username);
    
    // Emit to room only (exclude sender)
    socket.to(roomId).emit('typing_users', roomTypingUsers);
  });

  // Handle private messages
  socket.on('private_message', ({ to, message }) => {
    const sender = users[socket.id];
    if (!sender) return;

    const messageData = {
      id: `pm_${Date.now()}_${socket.id}`,
      sender: sender.username,
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
      to: to
    };
    
    messages.push(messageData);
    
    // Send to recipient
    socket.to(to).emit('private_message', messageData);
    
    // Send back to sender (for confirmation)
    socket.emit('private_message', messageData);
    
    console.log(`🔒 Private: ${sender.username} -> ${users[to]?.username || to}`);
  });

  // Handle room join - FIXED to prevent duplicate notifications
  socket.on('join_room', (roomId) => {
    const user = users[socket.id];
    if (!user) return;

    const currentRoom = user.currentRoom;
    
    // If already in this room, don't do anything
    if (currentRoom === roomId) {
      console.log(`⚠️ ${user.username} already in room ${roomId}`);
      return;
    }

    console.log(`🚪 ${user.username} switching from ${currentRoom} to ${roomId}`);

    // Leave current room silently (no broadcast needed)
    if (currentRoom && rooms[currentRoom]) {
      socket.leave(currentRoom);
      rooms[currentRoom].members.delete(socket.id);
      
      // Only notify the OLD room that user left
      socket.to(currentRoom).emit('user_left_room', {
        username: user.username,
        roomId: currentRoom
      });
    }

    // Join new room
    socket.join(roomId);
    user.currentRoom = roomId;
    
    // Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: roomId,
        name: roomId,
        members: new Set(),
        createdAt: new Date().toISOString()
      };
    }
    rooms[roomId].members.add(socket.id);

    // Send room history to the user
    const roomMessages = messages.filter(m => m.roomId === roomId).slice(-50);
    socket.emit('message_history', roomMessages);
    
    // Only notify the NEW room that user joined (not global broadcast)
    socket.to(roomId).emit('user_joined_room', {
      username: user.username,
      roomId: roomId
    });

    // Update room list for all users
    io.emit('rooms_list', getRoomList());
    
    console.log(`✅ ${user.username} now in ${roomId}. Members: ${rooms[roomId].members.size}`);
  });

  // Handle room creation
  socket.on('create_room', ({ name }, callback) => {
    const roomId = `room_${Date.now()}`;
    const user = users[socket.id];
    
    if (!user) {
      if (callback) callback({ success: false, error: 'User not found' });
      return;
    }

    console.log(`🆕 ${user.username} creating room: ${name}`);

    rooms[roomId] = {
      id: roomId,
      name: name,
      members: new Set(),
      createdBy: socket.id,
      createdAt: new Date().toISOString()
    };

    // Notify all users about new room
    io.emit('room_created', {
      id: roomId,
      name: name,
      memberCount: 0,
    });

    // Update rooms list
    io.emit('rooms_list', getRoomList());

    if (callback) {
      callback({ 
        success: true, 
        room: {
          id: roomId,
          name: name
        }
      });
    }
    
    console.log(`✅ Room created: ${name} (${roomId})`);
  });

  // Handle get rooms request
  socket.on('get_rooms', () => {
    socket.emit('rooms_list', getRoomList());
  });

  // Handle disconnection with improved debouncing
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Socket ${socket.id} disconnecting... Reason: ${reason}`);

    // Clear any user join debounce for this socket
    const user = users[socket.id];
    if (user) {
      delete userJoinDebounce[user.username];
    }

    // Clear any existing cleanup timer for this socket
    if (socketCleanupTimers[socket.id]) {
      clearTimeout(socketCleanupTimers[socket.id]);
      delete socketCleanupTimers[socket.id];
    }

    // Only debounce if it's a transport close (not intentional disconnect)
    if (reason === 'transport close' || reason === 'ping timeout') {
      // Debounce to handle rapid reconnections - increased timeout
      socketCleanupTimers[socket.id] = setTimeout(() => {
        const user = cleanupUser(socket.id);

        if (user) {
          console.log(`❌ ${user.username} disconnected (confirmed after debounce)`);

          // Notify all users ONCE
          io.emit('user_left', { username: user.username, id: socket.id });
          io.emit('user_list', getUserList());
          io.emit('rooms_list', getRoomList());

          // Update typing users
          const roomTypingUsers = Object.values(typingUsers);
          io.emit('typing_users', roomTypingUsers);
        }

        delete socketCleanupTimers[socket.id];
      }, 3000); // Increased to 3 seconds for better stability
    } else {
      // Immediate cleanup for intentional disconnects
      const user = cleanupUser(socket.id);

      if (user) {
        console.log(`❌ ${user.username} disconnected (immediate)`);

        // Notify all users ONCE
        io.emit('user_left', { username: user.username, id: socket.id });
        io.emit('user_list', getUserList());
        io.emit('rooms_list', getRoomList());

        // Update typing users
        const roomTypingUsers = Object.values(typingUsers);
        io.emit('typing_users', roomTypingUsers);
      }
    }
  });

  // Remove duplicate error handler - already added above
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    onlineUsers: Object.keys(users).length,
    totalMessages: messages.length,
    totalRooms: Object.keys(rooms).length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/messages', (req, res) => {
  const roomId = req.query.roomId || 'global';
  const limit = parseInt(req.query.limit) || 50;
  const roomMessages = messages
    .filter(m => m.roomId === roomId)
    .slice(-limit)
    .map(msg => ({
      ...msg,
      reactions: messageReactions[msg.id] || {}
    }));
  res.json(roomMessages);
});

app.get('/api/users', (req, res) => {
  res.json(getUserList());
});

app.get('/api/rooms', (req, res) => {
  res.json(getRoomList());
});

app.get('/api/stats', (req, res) => {
  res.json({
    users: Object.keys(users).length,
    messages: messages.length,
    rooms: Object.keys(rooms).length,
    activeRooms: Object.values(rooms).filter(r => r.members.size > 0).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Socket.io Chat Server is running',
    version: '2.0 - Fixed',
    onlineUsers: Object.keys(users).length,
    totalRooms: Object.keys(rooms).length,
    endpoints: {
      health: '/api/health',
      messages: '/api/messages',
      users: '/api/users',
      rooms: '/api/rooms',
      stats: '/api/stats'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   🚀 Chat Server Running (FIXED)      ║
║   📡 Port: ${PORT}                     ║
║   🌐 http://localhost:${PORT}          ║
║   ✅ Socket.io: Ready                  ║
║   🔧 Debouncing: Enabled               ║
║   💬 Reactions: Enabled                ║
╚═══════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };