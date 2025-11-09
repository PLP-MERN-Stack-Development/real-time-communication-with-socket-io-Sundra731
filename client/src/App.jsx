import { useState, useEffect, useRef } from 'react';
import { useSocket } from './socket/socket';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ChatRoom from './components/ChatRoom';
import MessageInput from './components/MessageInput';
import { NotificationManager } from './components/Notification';

export default function App() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notificationList, setNotificationList] = useState([]);

  const audioRef = useRef(null);
  const notificationIdRef = useRef(0);

  const {
    isConnected,
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
  } = useSocket();

  // Initialize app - ONLY RUN ONCE
  useEffect(() => {
    const savedUsername = localStorage.getItem('chatUsername');
    const savedEmail = localStorage.getItem('chatEmail');
    const savedTheme = localStorage.getItem('chatTheme') || 'dark';

    setTheme(savedTheme);

    if (savedUsername && savedUsername.trim() && savedEmail && savedEmail.trim()) {
      setUsername(savedUsername);
      setEmail(savedEmail);
      setIsLoggedIn(true);

      // Connect AFTER setting state - no delay needed
      connect(savedUsername);
    }

    setIsLoading(false);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup on unmount
    return () => {
      console.log('🧹 App unmounting, disconnecting socket');
      disconnect();
    };
  }, []); // Empty dependency array - only run once!

  // Handle new messages for notifications
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      
      // Only notify if: not from current user, not in current room, not system message
      if (
        lastMsg.sender !== username && 
        lastMsg.username !== username &&
        lastMsg.roomId !== currentRoom && 
        !lastMsg.system
      ) {
        // Update unread count
        setUnreadCounts(prev => ({
          ...prev,
          [lastMsg.roomId]: (prev[lastMsg.roomId] || 0) + 1
        }));

        // Play sound
        playNotificationSound();

        // Show browser notification
        showBrowserNotification(lastMsg.sender || lastMsg.username, lastMsg.message);

        // Add to notification list
        addToNotificationList({
          from: lastMsg.sender || lastMsg.username,
          message: lastMsg.message,
          timestamp: lastMsg.timestamp,
          roomId: lastMsg.roomId
        });

        // Show toast notification
        addNotification({
          id: notificationIdRef.current++,
          type: 'info',
          message: `New message from ${lastMsg.sender || lastMsg.username}`,
          duration: 3000
        });
      }
    }
  }, [messages, username, currentRoom]);

  // Clear unread when switching rooms
  useEffect(() => {
    if (currentRoom) {
      setUnreadCounts(prev => ({ ...prev, [currentRoom]: 0 }));
    }
  }, [currentRoom]);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {
        console.log('Audio play failed');
      });
    }
  };

  const showBrowserNotification = (sender, message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`Message from ${sender}`, {
        body: message.substring(0, 100),
        icon: '/chat-icon.png',
        badge: '/chat-badge.png',
        tag: 'chat-notification',
        requireInteraction: false,
      });

      // Close notification after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  };

  const addNotification = (notif) => {
    setNotifications(prev => [...prev, notif]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addToNotificationList = (notif) => {
    setNotificationList(prev => [notif, ...prev].slice(0, 20));
  };

  const handleLogin = (formData) => {
    setUsername(formData.username);
    setEmail(formData.email);
    connect(formData.username);
    setIsLoggedIn(true);
    localStorage.setItem('chatUsername', formData.username);
    localStorage.setItem('chatEmail', formData.email);
  };

  const handleLogout = () => {
    forceReset();
    setIsLoggedIn(false);
    setUsername('');
    setEmail('');
    setUnreadCounts({});
    setNotificationList([]);
    setNotifications([]);
    localStorage.removeItem('chatUsername');
    localStorage.removeItem('chatEmail');
  };

  const handleSendMessage = (messageData) => {
    if (messageData.text) {
      sendMessage(messageData.text);
    } else if (messageData.file) {
      // Send file info as message
      sendMessage(`📎 File: ${messageData.file.name} (${(messageData.file.size / 1024).toFixed(2)} KB)`);
    }
  };

  const handleTyping = (isTyping) => {
    setTyping(isTyping);
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      createRoom(newRoomName.trim());
      setNewRoomName('');
      setShowRoomModal(false);
      addNotification({
        id: notificationIdRef.current++,
        type: 'success',
        message: `Room "${newRoomName}" created successfully!`,
        duration: 3000
      });
    }
  };

  const handleSendPrivateMessage = (user) => {
    const msg = prompt(`Send private message to ${user.username}:`);
    if (msg && msg.trim()) {
      sendPrivateMessage(user.id, msg.trim());
      addNotification({
        id: notificationIdRef.current++,
        type: 'success',
        message: `Private message sent to ${user.username}`,
        duration: 3000
      });
    }
  };

  const handleReaction = (messageId, emoji) => {
    addReaction(messageId, emoji, currentRoom);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('chatTheme', newTheme);
  };

  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? room.name : roomId;
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const colors = theme === 'dark' ? {
    bg: 'bg-gray-900',
    bgSecondary: 'bg-gray-800',
    text: 'text-gray-100',
    textSecondary: 'text-gray-400',
    border: 'border-gray-700',
    hover: 'hover:bg-gray-700',
    input: 'bg-gray-800 border-gray-700 text-gray-100',
  } : {
    bg: 'bg-gray-50',
    bgSecondary: 'bg-white',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-gray-200',
    hover: 'hover:bg-gray-100',
    input: 'bg-white border-gray-300 text-gray-900',
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${colors.bg}`}>
        <div className={`${colors.text} text-xl flex items-center space-x-3`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span>Loading Chat App...</span>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} theme={theme} />;
  }

  return (
    <div className={`flex h-screen ${colors.bg}`}>
      {/* Notification Sound */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Toast Notifications */}
      <NotificationManager 
        notifications={notifications}
        onRemove={removeNotification}
      />

      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white py-2 px-4 text-center z-50 shadow-lg">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            <span className="font-medium">Reconnecting to server...</span>
          </div>
        </div>
      )}

      {/* Sidebar */}
      {showSidebar && (
        <Sidebar
          username={username}
          isConnected={isConnected}
          theme={theme}
          rooms={rooms}
          currentRoom={currentRoom}
          users={users}
          unreadCounts={unreadCounts}
          onLogout={handleLogout}
          onToggleTheme={toggleTheme}
          onJoinRoom={joinRoom}
          onCreateRoom={() => setShowRoomModal(true)}
          onSendPrivateMessage={handleSendPrivateMessage}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`${colors.bgSecondary} ${colors.border} border-b px-6 py-4 flex items-center justify-between shadow-sm`}>
          <div className="flex items-center space-x-3">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className={`${colors.text} ${colors.hover} p-2 rounded-lg transition`}
                title="Show sidebar"
              >
                ☰
              </button>
            )}
            <div>
              <h2 className={`text-xl font-semibold ${colors.text}`}>
                # {getRoomName(currentRoom)}
              </h2>
              <p className={`text-sm ${colors.textSecondary} flex items-center space-x-2`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                <span>•</span>
                <span>{users.length} online</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-lg ${colors.hover} ${colors.text} transition`}
              title="Search messages"
            >
              🔍
            </button>
            <button
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              className={`p-2 rounded-lg ${colors.hover} ${colors.text} relative transition`}
              title="Notifications"
            >
              🔔
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </button>
            {showSidebar && (
              <button
                onClick={() => setShowSidebar(false)}
                className={`lg:hidden ${colors.text} ${colors.hover} p-2 rounded-lg transition`}
                title="Hide sidebar"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className={`${colors.bgSecondary} ${colors.border} border-b px-6 py-3`}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className={`w-full px-4 py-2 ${colors.input} rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500`}
              autoFocus
            />
          </div>
        )}

        {/* Notification Panel */}
        {showNotificationPanel && (
          <div className={`${colors.bgSecondary} ${colors.border} border-b px-6 py-4 max-h-64 overflow-y-auto`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className={`font-semibold ${colors.text}`}>Recent Notifications</h3>
              <button
                onClick={() => setNotificationList([])}
                className="text-blue-500 hover:text-blue-400 text-sm transition"
              >
                Clear all
              </button>
            </div>
            {notificationList.length === 0 ? (
              <p className={`text-sm ${colors.textSecondary} text-center py-4`}>
                No new notifications
              </p>
            ) : (
              <div className="space-y-2">
                {notificationList.map((notif, i) => (
                  <div key={i} className={`p-3 rounded-lg ${colors.hover} transition`}>
                    <p className={`text-sm font-medium ${colors.text}`}>{notif.from}</p>
                    <p className={`text-xs ${colors.textSecondary} mt-1`}>
                      {notif.message.substring(0, 50)}...
                    </p>
                    <p className={`text-xs ${colors.textSecondary} mt-1`}>
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat Room */}
        <ChatRoom
          messages={messages}
          currentRoom={currentRoom}
          rooms={rooms}
          typingUsers={typingUsers}
          username={username}
          theme={theme}
          searchQuery={searchQuery}
          onReaction={handleReaction}
        />

        {/* Message Input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          isConnected={isConnected}
          theme={theme}
        />
      </div>

      {/* Create Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${colors.bgSecondary} rounded-xl p-6 w-96 shadow-2xl ${colors.border} border`}>
            <h3 className={`text-xl font-bold mb-4 ${colors.text}`}>Create New Room</h3>
            <form onSubmit={handleCreateRoom}>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name..."
                className={`w-full px-4 py-3 ${colors.input} rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4`}
                autoFocus
                required
              />
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold transition"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRoomModal(false);
                    setNewRoomName('');
                  }}
                  className={`flex-1 ${colors.hover} ${colors.text} py-2 rounded-lg font-semibold transition`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}