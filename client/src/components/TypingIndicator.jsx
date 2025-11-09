const TypingIndicator = ({ typingUsers, currentUsername, theme }) => {
    const colors = theme === 'dark' ? {
        text: 'text-gray-400',
    } : {
        text: 'text-gray-600',
    };

    // Filter out current user from typing users
    const otherUsers = typingUsers.filter(user => user !== currentUsername);

    if (otherUsers.length === 0) {
        return null;
    }

    const getTypingText = () => {
        if (otherUsers.length === 1) {
        return `${otherUsers[0]} is typing...`;
        } else if (otherUsers.length === 2) {
        return `${otherUsers[0]} and ${otherUsers[1]} are typing...`;
        } else if (otherUsers.length === 3) {
        return `${otherUsers[0]}, ${otherUsers[1]}, and ${otherUsers[2]} are typing...`;
        } else {
        return `${otherUsers.slice(0, 2).join(', ')}, and ${otherUsers.length - 2} others are typing...`;
        }
    };

    return (
        <div className={`flex items-center space-x-2 ${colors.text} text-sm py-2 px-4`}>
        <div className="flex space-x-1">
            <div 
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" 
            style={{ animationDelay: '0ms' }}
            />
            <div 
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" 
            style={{ animationDelay: '150ms' }}
            />
            <div 
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" 
            style={{ animationDelay: '300ms' }}
            />
        </div>
        <span className="italic">{getTypingText()}</span>
        </div>
    );
};

export default TypingIndicator;