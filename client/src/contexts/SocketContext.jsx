// client/src/contexts/SocketContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../socket/socket';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
    };

    export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);

    useEffect(() => {
        // Get user from localStorage (after authentication)
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (user.userId && user.username) {
        const newSocket = socketService.connect(user.userId, user.username);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            setConnected(true);
        });

        newSocket.on('disconnect', () => {
            setConnected(false);
        });

        newSocket.on('users:online', (users) => {
            setOnlineUsers(users);
        });
        }

        return () => {
        socketService.disconnect();
        };
    }, []);

    const value = {
        socket,
        connected,
        onlineUsers
    };

    return (
        <SocketContext.Provider value={value}>
        {children}
        </SocketContext.Provider>
    );
};