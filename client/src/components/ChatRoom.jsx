import { useEffect, useRef } from 'react';
import Message from './Message';
import TypingIndicator from './TypingIndicator';
import './ChatRoom.css';

const ChatRoom = ({
    messages,
    currentRoom,
    rooms,
    typingUsers,
    username,
    theme,
    searchQuery,
    onReaction,
    }) => {
    const messagesEndRef = useRef(null);

    const colors = theme === 'dark' ? {
        bg: 'bg-gray-900',
        text: 'text-gray-100',
        textSecondary: 'text-gray-400',
    } : {
        bg: 'bg-gray-50',
        text: 'text-gray-900',
        textSecondary: 'text-gray-600',
    };

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const getRoomName = (roomId) => {
        const room = rooms.find(r => r.id === roomId);
        return room ? room.name : roomId;
    };

    // Filter messages based on search query
    const filteredMessages = searchQuery
        ? messages.filter(msg => 
            msg.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.sender?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.username?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : messages;

    return (
        <div className={`flex-1 overflow-y-auto p-6 space-y-4 ${colors.bg} custom-scrollbar`}>
        {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className={`text-lg ${colors.text} mb-2`}>
                {searchQuery ? 'No messages found' : `Welcome to #${getRoomName(currentRoom)}`}
                </p>
                <p className={`text-sm ${colors.textSecondary}`}>
                {searchQuery 
                    ? 'Try a different search term' 
                    : 'Start the conversation by sending a message!'}
                </p>
            </div>
            </div>
        ) : (
            <>
            {/* Messages */}
            {filteredMessages.map((msg) => (
                <Message
                key={msg.id}
                message={msg}
                isOwnMessage={msg.sender === username || msg.username === username}
                theme={theme}
                onReaction={onReaction}
                username={username}
                />
            ))}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
                <TypingIndicator 
                typingUsers={typingUsers}
                currentUsername={username}
                theme={theme}
                />
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
            </>
        )}
        </div>
    );
};

export default ChatRoom;