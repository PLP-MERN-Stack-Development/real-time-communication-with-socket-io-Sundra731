import { useEffect, useState } from 'react';

const Notification = ({ 
    message, 
    type = 'info', 
    duration = 3000,
    onClose 
    }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
        handleClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
        }, 300);
    };

    if (!isVisible) return null;

    const types = {
        success: {
        bg: 'bg-green-500',
        icon: '✓',
        text: 'Success'
        },
        error: {
        bg: 'bg-red-500',
        icon: '✕',
        text: 'Error'
        },
        warning: {
        bg: 'bg-yellow-500',
        icon: '⚠',
        text: 'Warning'
        },
        info: {
        bg: 'bg-blue-500',
        icon: 'ℹ',
        text: 'Info'
        }
    };

    const config = types[type] || types.info;

    return (
        <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
        }`}>
        <div className={`${config.bg} text-white rounded-lg shadow-2xl p-4 flex items-start space-x-3 min-w-[300px] max-w-md`}>
            <div className="flex-shrink-0 w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center font-bold">
            {config.icon}
            </div>
            <div className="flex-1">
            <p className="font-semibold text-sm">{config.text}</p>
            <p className="text-sm mt-1 opacity-90">{message}</p>
            </div>
            <button
            onClick={handleClose}
            className="flex-shrink-0 text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition"
            >
            ✕
            </button>
        </div>
        </div>
    );
    };

    // Notification Manager Component
    export const NotificationManager = ({ notifications, onRemove }) => {
    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notif, index) => (
            <Notification
            key={notif.id || index}
            message={notif.message}
            type={notif.type}
            duration={notif.duration}
            onClose={() => onRemove(notif.id || index)}
            />
        ))}
        </div>
    );
};

export default Notification;