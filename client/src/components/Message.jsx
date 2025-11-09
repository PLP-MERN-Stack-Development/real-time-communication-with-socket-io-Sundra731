import { useState } from 'react';
import './Message.css';

const Message = ({
    message,
    isOwnMessage,
    theme,
    onReaction,
    username
    }) => {
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const reactions = message.reactions || {};

    const colors = theme === 'dark' ? {
        messageBg: 'bg-gray-800',
        ownMessage: 'bg-blue-600',
        text: 'text-gray-100',
        textSecondary: 'text-gray-400',
    } : {
        messageBg: 'bg-white',
        ownMessage: 'bg-blue-500',
        text: 'text-gray-900',
        textSecondary: 'text-gray-600',
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
        });
    };

    const handleReaction = (emoji) => {
        // Emit reaction to server
        onReaction(message.id, emoji);
        setShowReactionPicker(false);
    };

    const isSystemMessage = message.system;

    if (isSystemMessage) {
        return (
        <div className="text-center my-2">
            <span className={`text-xs ${colors.textSecondary} bg-gray-700 px-3 py-1 rounded-full inline-block`}>
            {message.message}
            </span>
        </div>
        );
    }

    return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 group`}>
        <div className="relative max-w-xs lg:max-w-md">
            <div
            className={`${
                isOwnMessage
                ? `${colors.ownMessage} text-white`
                : `${colors.messageBg} ${colors.text} shadow-lg`
            } rounded-2xl px-4 py-2 relative message-bubble`}
            onContextMenu={(e) => {
                e.preventDefault();
                setShowReactionPicker(!showReactionPicker);
            }}
            >
            {!isOwnMessage && (
                <div className="text-xs font-semibold mb-1 text-blue-400">
                {message.sender || message.username}
                </div>
            )}
            
            <p className="break-words whitespace-pre-wrap">{message.message}</p>
            
            <div
                className={`text-xs mt-1 flex items-center justify-between ${
                isOwnMessage ? 'text-blue-100' : colors.textSecondary
                }`}
            >
                <span>{formatTime(message.timestamp)}</span>
                {isOwnMessage && (
                <span className="ml-2 flex items-center">
                    <span className="checkmark">✓✓</span>
                </span>
                )}
            </div>

            {/* Reaction Picker */}
            {showReactionPicker && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-lg p-2 flex space-x-1 shadow-2xl z-10 reaction-picker">
                {['❤️', '👍', '😂', '😮', '😢', '🎉', '🔥', '👏'].map(emoji => (
                    <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="hover:scale-125 transition-transform text-xl p-1 hover:bg-gray-700 rounded"
                    title={`React with ${emoji}`}
                    >
                    {emoji}
                    </button>
                ))}
                </div>
            )}
            </div>

            {/* Display reactions */}
            {Object.keys(reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(reactions).map(([emoji, users]) => (
                <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`text-xs px-2 py-1 rounded-full ${
                    users.includes(username) 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-700 text-gray-300'
                    } hover:scale-110 transition-transform flex items-center space-x-1`}
                    title={`Reacted by: ${users.join(', ')}`}
                >
                    <span>{emoji}</span>
                    <span>{users.length}</span>
                </button>
                ))}
            </div>
            )}

            {/* Hover actions */}
            <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className="bg-gray-700 hover:bg-gray-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg"
                title="Add reaction"
            >
                😊
            </button>
            </div>
        </div>
        </div>
    );
};

export default Message;