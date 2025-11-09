// server/utils/socketHandlers.js

// Store messages in memory (use database in production)
const messages = [];
const typingUsers = new Map();
const rooms = new Map([
    ['global', { id: 'global', name: 'Global Chat', members: new Set() }],
    ['tech', { id: 'tech', name: 'Tech Talk', members: new Set() }],
    ['random', { id: 'random', name: 'Random', members: new Set() }]
]);

const setupChatHandlers = (io, socket, onlineUsers, userSockets) => {
    
    // Get available rooms
    socket.on('rooms:list', (callback) => {
        const roomsList = Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        memberCount: room.members.size
        }));
        
        if (callback) callback(roomsList);
    });

    // Create new room
    socket.on('room:create', (data, callback) => {
        const roomId = `room_${Date.now()}`;
        const newRoom = {
        id: roomId,
        name: data.name,
        members: new Set([socket.userId]),
        createdBy: socket.userId,
        createdAt: new Date()
        };
        
        rooms.set(roomId, newRoom);
        socket.join(roomId);
        
        if (callback) {
        callback({ success: true, room: newRoom });
        }
        
        // Broadcast new room to all users
        io.emit('room:created', {
        id: newRoom.id,
        name: newRoom.name,
        memberCount: 1
        });
    });
    
    // Join global chat room
    socket.on('room:join', (roomId = 'global', callback) => {
        socket.join(roomId);
        socket.currentRoom = roomId;
        
        // Add user to room members
        if (rooms.has(roomId)) {
        rooms.get(roomId).members.add(socket.userId);
        }
        
        // Send recent chat history (last 50 messages)
        const roomMessages = messages
        .filter(msg => msg.roomId === roomId)
        .slice(-50);
        
        socket.emit('messages:history', roomMessages);
        
        if (callback) {
        callback({ success: true, messageCount: roomMessages.length });
        }
        
        // Notify others
        socket.to(roomId).emit('user:joined', {
        username: socket.username,
        userId: socket.userId,
        timestamp: new Date()
        });
        
        // Update room member count
        io.emit('room:updated', {
        roomId,
        memberCount: rooms.get(roomId)?.members.size || 0
        });
        
        console.log(`${socket.username} joined room: ${roomId}`);
    });

    // Load older messages (pagination)
    socket.on('messages:load', (data, callback) => {
        const { roomId, before, limit = 20 } = data;
        
        const roomMessages = messages
        .filter(msg => msg.roomId === roomId)
        .filter(msg => !before || new Date(msg.timestamp) < new Date(before))
        .slice(-limit);
        
        if (callback) {
        callback({
            messages: roomMessages,
            hasMore: roomMessages.length === limit
        });
        }
    });

    // Handle new message
    socket.on('message:send', (data, callback) => {
        const message = {
        id: Date.now().toString(),
        userId: socket.userId,
        username: socket.username,
        content: data.content,
        roomId: data.roomId || socket.currentRoom || 'global',
        timestamp: new Date(),
        status: 'sent',
        type: data.type || 'text', // text, file, image
        recipientId: data.recipientId // for private messages
        };

        // Store message
        messages.push(message);

        // Private message
        if (data.recipientId) {
        const recipientSocketId = userSockets.get(data.recipientId);
        
        if (recipientSocketId) {
            // Send to recipient
            io.to(recipientSocketId).emit('message:private', message);
            
            // Send back to sender
            socket.emit('message:private', message);
            
            // Send notification to recipient
            io.to(recipientSocketId).emit('notification:new', {
            type: 'private_message',
            from: socket.username,
            fromId: socket.userId,
            message: message.content,
            timestamp: new Date()
            });
        }
        } else {
        // Broadcast to room
        io.to(message.roomId).emit('message:new', message);
        }

        // Send acknowledgment
        if (callback) {
        callback({ success: true, messageId: message.id });
        }
    });

    // Typing indicator
    socket.on('typing:start', (roomId) => {
        const room = roomId || socket.currentRoom || 'global';
        
        if (!typingUsers.has(room)) {
        typingUsers.set(room, new Set());
        }
        typingUsers.get(room).add(socket.username);

        socket.to(room).emit('typing:update', {
        users: Array.from(typingUsers.get(room))
        });
    });

    socket.on('typing:stop', (roomId) => {
        const room = roomId || socket.currentRoom || 'global';
        
        if (typingUsers.has(room)) {
        typingUsers.get(room).delete(socket.username);
        
        socket.to(room).emit('typing:update', {
            users: Array.from(typingUsers.get(room))
        });
        }
    });

    // Leave room
    socket.on('room:leave', (roomId) => {
        socket.leave(roomId);
        
        socket.to(roomId).emit('user:left', {
        username: socket.username,
        userId: socket.userId,
        timestamp: new Date()
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        // Remove from room members
        if (socket.currentRoom && rooms.has(socket.currentRoom)) {
        rooms.get(socket.currentRoom).members.delete(socket.userId);
        
        // Update room member count
        io.emit('room:updated', {
            roomId: socket.currentRoom,
            memberCount: rooms.get(socket.currentRoom).members.size
        });
        }
        
        // Clean up typing indicators
        typingUsers.forEach((users, room) => {
        if (users.has(socket.username)) {
            users.delete(socket.username);
            io.to(room).emit('typing:update', {
            users: Array.from(users)
            });
        }
        });

        // Notify room about user leaving
        if (socket.currentRoom) {
        io.to(socket.currentRoom).emit('user:left', {
            username: socket.username,
            userId: socket.userId,
            timestamp: new Date()
        });
        }
    });

    // Read receipts
    socket.on('message:read', (data) => {
        const { messageId, roomId } = data;
        
        // Update message status
        const message = messages.find(m => m.id === messageId);
        if (message) {
        if (!message.readBy) {
            message.readBy = [];
        }
        message.readBy.push({
            userId: socket.userId,
            username: socket.username,
            timestamp: new Date()
        });
        
        // Notify sender
        io.to(roomId).emit('message:read:update', {
            messageId,
            readBy: message.readBy
        });
        }
    });

    // Message reactions
    socket.on('message:react', (data) => {
        const { messageId, emoji, roomId } = data;
        
        const message = messages.find(m => m.id === messageId);
        if (message) {
        if (!message.reactions) {
            message.reactions = {};
        }
        
        if (!message.reactions[emoji]) {
            message.reactions[emoji] = [];
        }
        
        // Toggle reaction
        const userIndex = message.reactions[emoji].findIndex(
            u => u.userId === socket.userId
        );
        
        if (userIndex > -1) {
            message.reactions[emoji].splice(userIndex, 1);
        } else {
            message.reactions[emoji].push({
            userId: socket.userId,
            username: socket.username
            });
        }
        
        // Broadcast reaction update
        io.to(roomId).emit('message:reaction:update', {
            messageId,
            reactions: message.reactions
        });
        }
    });
};

module.exports = { setupChatHandlers };