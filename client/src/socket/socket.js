// client/src/socket/socket.js 
import { io } from 'socket.io-client';
import { useEffect, useState, useRef } from 'react';

// Socket.io connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

console.log('🔌 Socket URL:', SOCKET_URL);

// Create socket instance OUTSIDE the hook (singleton pattern)
let socketInstance = null;

const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: false, // Disable auto-reconnection to prevent loops
      timeout: 20000,
      transports: ['websocket', 'polling'], // Try websocket first
    });
  }
  return socketInstance;
};

// Custom hook for using socket.io
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('global');
  
  const hasJoinedRef = useRef(false);
  const usernameRef = useRef(null);
  const lastConnectTimeRef = useRef(0);
  const socket = getSocket();

  // Connect to socket server
  const connect = (username) => {
    console.log('👤 Attempting to connect with username:', username);

    // Prevent multiple connections
    if (socket.connected) {
      console.log('⚠️ Already connected, skipping...');
      return;
    }

    // Prevent rapid reconnections (debounce)
    const now = Date.now();
    if (now - lastConnectTimeRef.current < 2000) {
      console.log('⚠️ Connection attempt too soon, debouncing...');
      return;
    }
    lastConnectTimeRef.current = now;

    usernameRef.current = username;
    socket.connect();

    // Wait for connection before emitting user_join
    socket.once('connect', () => {
      if (!hasJoinedRef.current && username) {
        console.log('✅ Connected, emitting user_join...');
        socket.emit('user_join', username);
        hasJoinedRef.current = true;
      }
    });
  };

  // Disconnect from socket server
  const disconnect = () => {
    console.log('👋 Disconnecting...');
    hasJoinedRef.current = false;
    usernameRef.current = null;
    socket.disconnect();
  };

  // Force reset connection state (for manual logout)
  const forceReset = () => {
    console.log('🔄 Force resetting connection state...');
    hasJoinedRef.current = false;
    usernameRef.current = null;
    lastConnectTimeRef.current = 0;
    socket.disconnect();
  };

  // Send a message
  const sendMessage = (message) => {
    if (!socket.connected) {
      console.error('❌ Cannot send message: not connected');
      return;
    }
    console.log('📤 Sending message:', message);
    socket.emit('send_message', { 
      message,
      roomId: currentRoom 
    });
  };

  // Send a private message
  const sendPrivateMessage = (to, message) => {
    if (!socket.connected) {
      console.error('❌ Cannot send private message: not connected');
      return;
    }
    console.log('🔒 Sending private message to:', to);
    socket.emit('private_message', { to, message });
  };

  // Add reaction to message
  const addReaction = (messageId, emoji, roomId) => {
    if (!socket.connected) {
      console.error('❌ Cannot add reaction: not connected');
      return;
    }
    console.log('👍 Adding reaction:', emoji, 'to message:', messageId);
    socket.emit('message:react', { messageId, emoji, roomId: roomId || currentRoom });
  };

  // Set typing status
  const setTyping = (isTyping) => {
    if (!socket.connected) return;
    socket.emit('typing', isTyping);
  };

  // Join a room
  const joinRoom = (roomId) => {
    if (!socket.connected) {
      console.error('❌ Cannot join room: not connected');
      return;
    }
    console.log('🚪 Joining room:', roomId);
    socket.emit('join_room', roomId);
    setCurrentRoom(roomId);
  };

  // Create a new room
  const createRoom = (roomName) => {
    if (!socket.connected) {
      console.error('❌ Cannot create room: not connected');
      return;
    }
    console.log('🆕 Creating room:', roomName);
    socket.emit('create_room', { name: roomName }, (response) => {
      console.log('Room creation response:', response);
      if (response?.success) {
        joinRoom(response.room.id);
      }
    });
  };

  // Request rooms list
  const requestRoomsList = () => {
    if (!socket.connected) return;
    console.log('📋 Requesting rooms list');
    socket.emit('get_rooms');
  };

  // Socket event listeners - only set up once
  useEffect(() => {
    console.log('🔧 Setting up socket listeners...');

    // Connection events
    const onConnect = () => {
      console.log('✅ Connected to server:', socket.id);
      setIsConnected(true);
    };

    const onDisconnect = (reason) => {
      console.log('❌ Disconnected from server. Reason:', reason);
      setIsConnected(false);
      // Don't reset hasJoinedRef on disconnect to prevent re-joining loops
      // hasJoinedRef.current = false;
    };

    const onConnectError = (error) => {
      console.error('❌ Connection error:', error.message);
      setIsConnected(false);
    };

    // Message events
    const onReceiveMessage = (message) => {
      console.log('📥 Received message:', message);
      setLastMessage(message);
      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.find(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    };

    const onMessageReaction = ({ messageId, reactions }) => {
      console.log('👍 Reaction update for message:', messageId);
      setMessages((prev) =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, reactions }
            : msg
        )
      );
    };

    const onPrivateMessage = (message) => {
      console.log('🔒 Received private message:', message);
      setLastMessage(message);
      setMessages((prev) => [...prev, { ...message, system: false }]);
    };

    const onMessageHistory = (history) => {
      console.log('📜 Received message history:', history.length, 'messages');
      setMessages(history || []);
    };

    // User events
    const onUserList = (userList) => {
      console.log('👥 Received user list:', userList.length, 'users');
      setUsers(userList || []);
    };

    const onUserJoined = (user) => {
      console.log('👋 User joined:', user.username);
      // Don't add system messages here - let server handle it
    };

    const onUserLeft = (user) => {
      console.log('👋 User left:', user.username);
      // Don't add system messages here - let server handle it
    };

    const onUserJoinedRoom = (data) => {
      console.log('🚪 User joined room:', data.username, 'in', data.roomId);
      // Only show if it's the current room
      if (data.roomId === currentRoom) {
        setMessages((prev) => [
          ...prev,
          {
            id: `system_join_${Date.now()}`,
            system: true,
            message: `${data.username} joined the room`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    };

    const onUserLeftRoom = (data) => {
      console.log('🚪 User left room:', data.username, 'from', data.roomId);
      // Only show if it's the current room
      if (data.roomId === currentRoom) {
        setMessages((prev) => [
          ...prev,
          {
            id: `system_leave_${Date.now()}`,
            system: true,
            message: `${data.username} left the room`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    };

    // Typing events
    const onTypingUsers = (users) => {
      setTypingUsers(users || []);
    };

    // Room events
    const onRoomsList = (roomsList) => {
      console.log('🏠 Received rooms list:', roomsList.length, 'rooms');
      setRooms(roomsList || []);
    };

    const onRoomCreated = (room) => {
      console.log('🆕 Room created:', room.name);
      setRooms((prev) => {
        // Prevent duplicates
        if (prev.find(r => r.id === room.id)) {
          return prev;
        }
        return [...prev, room];
      });
    };

    // Register all event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('receive_message', onReceiveMessage);
    socket.on('message:reaction:update', onMessageReaction);
    socket.on('private_message', onPrivateMessage);
    socket.on('message_history', onMessageHistory);
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('user_joined_room', onUserJoinedRoom);
    socket.on('user_left_room', onUserLeftRoom);
    socket.on('typing_users', onTypingUsers);
    socket.on('rooms_list', onRoomsList);
    socket.on('room_created', onRoomCreated);

    console.log('✅ Socket listeners registered');

    // Cleanup function - remove all listeners
    return () => {
      console.log('🧹 Cleaning up socket listeners...');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('receive_message', onReceiveMessage);
      socket.off('message:reaction:update', onMessageReaction);
      socket.off('private_message', onPrivateMessage);
      socket.off('message_history', onMessageHistory);
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('user_joined_room', onUserJoinedRoom);
      socket.off('user_left_room', onUserLeftRoom);
      socket.off('typing_users', onTypingUsers);
      socket.off('rooms_list', onRoomsList);
      socket.off('room_created', onRoomCreated);
    };
  }, [currentRoom]); // Only depend on currentRoom

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    users,
    typingUsers,
    rooms,
    currentRoom,
    connect,
    disconnect,
    forceReset,
    sendMessage,
    sendPrivateMessage,
    addReaction,
    setTyping,
    joinRoom,
    createRoom,
    requestRoomsList,
  };
};

// Export socket instance
export const socket = getSocket();
export default socket;