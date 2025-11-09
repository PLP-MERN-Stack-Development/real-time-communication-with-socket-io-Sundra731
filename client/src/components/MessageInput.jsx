import { useState, useRef } from 'react';
import './MessageInput.css';

const MessageInput = ({ 
    onSendMessage, 
    onTyping, 
    isConnected,
    theme 
    }) => {
    const [message, setMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const colors = theme === 'dark' ? {
        bgSecondary: 'bg-gray-800',
        bgTertiary: 'bg-gray-700',
        text: 'text-gray-100',
        border: 'border-gray-700',
        hover: 'hover:bg-gray-700',
        input: 'bg-gray-800 border-gray-700 text-gray-100',
    } : {
        bgSecondary: 'bg-white',
        bgTertiary: 'bg-gray-100',
        text: 'text-gray-900',
        border: 'border-gray-200',
        hover: 'hover:bg-gray-100',
        input: 'bg-white border-gray-300 text-gray-900',
    };

    const handleChange = (e) => {
        setMessage(e.target.value);

        // Trigger typing indicator
        onTyping(true);

        // Clear previous timeout
        if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
        }, 2000);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (message.trim() || selectedFile) {
        const messageData = {
            text: message.trim(),
            file: selectedFile,
            filePreview: previewUrl
        };
        
        onSendMessage(messageData);
        setMessage('');
        setSelectedFile(null);
        setPreviewUrl(null);
        onTyping(false);
        
        // Clear timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
        setSelectedFile(file);
        
        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
            setPreviewUrl(e.target.result);
            };
            reader.readAsDataURL(file);
        }
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
        fileInputRef.current.value = '';
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
        }
    };

    return (
        <div className={`${colors.bgSecondary} ${colors.border} border-t px-6 py-4`}>
        {/* File Preview */}
        {selectedFile && (
            <div className={`mb-3 ${colors.bgTertiary} rounded-lg p-3 flex items-center justify-between`}>
            <div className="flex items-center space-x-3">
                {previewUrl ? (
                <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-12 h-12 object-cover rounded"
                />
                ) : (
                <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center">
                    📄
                </div>
                )}
                <div>
                <p className={`text-sm font-medium ${colors.text}`}>{selectedFile.name}</p>
                <p className={`text-xs ${colors.textSecondary}`}>
                    {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                </div>
            </div>
            <button
                onClick={removeFile}
                className="text-red-500 hover:text-red-400 text-xl"
                title="Remove file"
            >
                ✕
            </button>
            </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
            <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            />
            
            {/* File Upload Button */}
            <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-3 rounded-full ${colors.hover} ${colors.text} transition-all hover:scale-110`}
            title="Attach file"
            disabled={!isConnected}
            >
            📎
            </button>

            {/* Emoji Button */}
            <button
            type="button"
            onClick={() => {
                // Could add emoji picker here
                alert('Emoji picker coming soon!');
            }}
            className={`p-3 rounded-full ${colors.hover} ${colors.text} transition-all hover:scale-110`}
            title="Add emoji"
            disabled={!isConnected}
            >
            😊
            </button>

            {/* Message Input */}
            <textarea
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            className={`flex-1 px-4 py-3 ${colors.input} rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
            rows="1"
            disabled={!isConnected}
            style={{
                minHeight: '48px',
                maxHeight: '120px',
            }}
            />

            {/* Send Button */}
            <button
            type="submit"
            disabled={(!message.trim() && !selectedFile) || !isConnected}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-semibold transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed transform hover:scale-105 flex items-center space-x-2"
            >
            <span>Send</span>
            <span>📤</span>
            </button>
        </form>

        {/* Keyboard Shortcut Hint */}
        <p className={`text-xs ${colors.textSecondary} mt-2 text-center`}>
            Press Enter to send, Shift+Enter for new line
        </p>
        </div>
    );
};

export default MessageInput;