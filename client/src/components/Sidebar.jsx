import './Sidebar.css';

const Sidebar = ({
    username,
    isConnected,
    theme,
    rooms,
    currentRoom,
    users,
    unreadCounts,
    onLogout,
    onToggleTheme,
    onJoinRoom,
    onCreateRoom,
    onSendPrivateMessage,
}) => {
    const colors = theme === 'dark' ? {
        bgSecondary: 'bg-gray-800',
        bgTertiary: 'bg-gray-700',
        text: 'text-gray-100',
        textSecondary: 'text-gray-400',
        border: 'border-gray-700',
        hover: 'hover:bg-gray-700',
    } : {
        bgSecondary: 'bg-white',
        bgTertiary: 'bg-gray-100',
        text: 'text-gray-900',
        textSecondary: 'text-gray-600',
        border: 'border-gray-200',
        hover: 'hover:bg-gray-100',
    };

    const getUserInitial = (name) => {
        if (!name || typeof name !== 'string' || name.length === 0) {
        return '?';
        }
        return name.charAt(0).toUpperCase();
    };

    return (
        <div className={`w-72 ${colors.bgSecondary} ${colors.border} border-r overflow-hidden flex flex-col h-full`}>
        {/* User Profile Section */}
        <div className={`p-4 ${colors.border} border-b`}>
            <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${colors.text}`}>Chat App</h2>
            <div className="flex items-center space-x-2">
                <button
                onClick={onToggleTheme}
                className={`p-2 rounded-lg ${colors.hover} ${colors.text} transition`}
                title="Toggle theme"
                >
                {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <div 
                className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                title={isConnected ? 'Connected' : 'Disconnected'}
                />
            </div>
            </div>
            
            <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {getUserInitial(username)}
            </div>
            <div className="flex-1">
                <p className={`font-medium ${colors.text} truncate`}>{username}</p>
                <p className="text-xs text-green-500 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                Online
                </p>
            </div>
            <button
                onClick={onLogout}
                className="text-red-500 hover:text-red-600 text-xl transition"
                title="Logout"
            >
                🚪
            </button>
            </div>
        </div>

        {/* Rooms Section */}
        <div className={`p-4 ${colors.border} border-b`}>
            <div className="flex justify-between items-center mb-3">
            <h3 className={`text-sm font-semibold ${colors.textSecondary} uppercase tracking-wide`}>
                Rooms
            </h3>
            <button
                onClick={onCreateRoom}
                className="text-blue-500 hover:text-blue-400 text-2xl font-bold leading-none transition"
                title="Create Room"
            >
                +
            </button>
            </div>
            
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
            {rooms.length === 0 ? (
                <p className={`text-sm ${colors.textSecondary}`}>Loading rooms...</p>
            ) : (
                rooms.map((room) => (
                <div
                    key={room.id}
                    onClick={() => onJoinRoom(room.id)}
                    className={`p-3 rounded-lg cursor-pointer transition transform hover:scale-105 ${
                    currentRoom === room.id
                        ? 'bg-blue-500 text-white shadow-lg'
                        : `${colors.bgTertiary} ${colors.hover} ${colors.text}`
                    }`}
                >
                    <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center">
                        <span className="mr-2">#</span>
                        {room.name}
                    </span>
                    <div className="flex items-center space-x-2">
                        {unreadCounts[room.id] > 0 && currentRoom !== room.id && (
                        <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                            {unreadCounts[room.id] > 9 ? '9+' : unreadCounts[room.id]}
                        </span>
                        )}
                        {room.memberCount !== undefined && (
                        <span className="text-xs opacity-75">
                            👥 {room.memberCount}
                        </span>
                        )}
                    </div>
                    </div>
                </div>
                ))
            )}
            </div>
        </div>

        {/* Online Users Section */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <h3 className={`text-sm font-semibold ${colors.textSecondary} uppercase tracking-wide mb-3`}>
            Online Users ({users.length})
            </h3>
            
            {users.length === 0 ? (
            <p className={`text-sm ${colors.textSecondary}`}>No users online</p>
            ) : (
            <div className="space-y-2">
                {users.map((user) => (
                <div
                    key={user.id}
                    className={`flex items-center space-x-3 p-2 rounded-lg ${colors.hover} cursor-pointer transition transform hover:scale-105`}
                    onClick={() => onSendPrivateMessage(user)}
                    title={`Click to send private message to ${user.username}`}
                >
                    <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow">
                        {getUserInitial(user.username)}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full animate-pulse" />
                    </div>
                    <div className="flex-1">
                    <p className={`text-sm font-medium ${colors.text} truncate`}>
                        {user.username}
                    </p>
                    <p className="text-xs text-green-500">Online</p>
                    </div>
                    <span className="text-xs opacity-50">💬</span>
                </div>
                ))}
            </div>
            )}
        </div>
        </div>
    );
};

export default Sidebar;