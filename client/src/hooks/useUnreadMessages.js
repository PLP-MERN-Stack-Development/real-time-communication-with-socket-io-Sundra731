// client/src/hooks/useUnreadMessages.js
import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

export const useUnreadMessages = (currentRoomId) => {
    const { socket } = useSocket();
    const [unreadByRoom, setUnreadByRoom] = useState({});

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message) => {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Don't count own messages
        if (message.userId === currentUser.userId) return;

        // Don't count messages from current room
        if (message.roomId === currentRoomId) return;

        setUnreadByRoom(prev => ({
            ...prev,
            [message.roomId]: (prev[message.roomId] || 0) + 1
        }));

        // Update page title
        updatePageTitle();
        };

        const handlePrivateMessage = (message) => {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (message.userId === currentUser.userId) return;

        const chatId = `private_${message.userId}`;
        
        setUnreadByRoom(prev => ({
            ...prev,
            [chatId]: (prev[chatId] || 0) + 1
        }));

        updatePageTitle();
        };

        socket.on('message:new', handleNewMessage);
        socket.on('message:private', handlePrivateMessage);

        return () => {
        socket.off('message:new', handleNewMessage);
        socket.off('message:private', handlePrivateMessage);
        };
    }, [socket, currentRoomId]);

    // Update page title with unread count
    const updatePageTitle = () => {
        const totalUnread = Object.values(unreadByRoom).reduce((a, b) => a + b, 0);
        
        if (totalUnread > 0) {
        document.title = `(${totalUnread}) Chat App`;
        } else {
        document.title = 'Chat App';
        }
    };

    const markAsRead = (roomId) => {
        setUnreadByRoom(prev => {
        const newState = { ...prev };
        delete newState[roomId];
        return newState;
        });
        updatePageTitle();
    };

    const getTotalUnread = () => {
        return Object.values(unreadByRoom).reduce((a, b) => a + b, 0);
    };

    const getUnreadCount = (roomId) => {
        return unreadByRoom[roomId] || 0;
    };

    return {
        unreadByRoom,
        markAsRead,
        getTotalUnread,
        getUnreadCount
    };
};