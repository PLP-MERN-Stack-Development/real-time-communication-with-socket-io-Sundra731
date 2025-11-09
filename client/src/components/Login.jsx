import { useState } from 'react';
import './Login.css';

const Login = ({ onLogin, theme = 'dark' }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: ''
    });
    const [errors, setErrors] = useState({});

    const colors = theme === 'dark' ? {
        bg: 'bg-gray-900',
        bgSecondary: 'bg-gray-800',
        text: 'text-gray-100',
        textSecondary: 'text-gray-400',
        border: 'border-gray-700',
        input: 'bg-gray-800 border-gray-700 text-gray-100',
    } : {
        bg: 'bg-gray-50',
        bgSecondary: 'bg-white',
        text: 'text-gray-900',
        textSecondary: 'text-gray-600',
        border: 'border-gray-200',
        input: 'bg-white border-gray-300 text-gray-900',
    };

    const validateForm = () => {
        const newErrors = {};
        
        // Username validation
        if (!formData.username.trim()) {
        newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
        } else if (formData.username.length > 20) {
        newErrors.username = 'Username must be less than 20 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = 'Username can only contain letters, numbers, and underscores';
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
        ...prev,
        [name]: value
        }));
        
        // Clear error for this field when user starts typing
        if (errors[name]) {
        setErrors(prev => ({
            ...prev,
            [name]: ''
        }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
        // Save both username and email
        localStorage.setItem('chatUsername', formData.username.trim());
        localStorage.setItem('chatEmail', formData.email.trim());
        onLogin(formData);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center ${colors.bg}`}>
        <div className={`${colors.bgSecondary} p-8 rounded-2xl shadow-2xl w-full max-w-md ${colors.border} border`}>
            <div className="text-center mb-8">
            <div className="text-6xl mb-4">💬</div>
            <h1 className={`text-3xl font-bold mb-2 ${colors.text}`}>
                Welcome to Chat App
            </h1>
            <p className={`${colors.textSecondary} text-sm`}>
                Real-time messaging with Socket.io
            </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
                <label htmlFor="username" className={`block text-sm font-medium mb-2 ${colors.text}`}>
                Username
                </label>
                <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a unique username"
                className={`w-full px-4 py-3 ${colors.input} rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                    errors.username ? 'border-red-500' : ''
                }`}
                autoFocus
                />
                {errors.username && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {errors.username}
                </p>
                )}
            </div>
            
            <div className="form-group">
                <label htmlFor="email" className={`block text-sm font-medium mb-2 ${colors.text}`}>
                Email Address
                </label>
                <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                className={`w-full px-4 py-3 ${colors.input} rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                    errors.email ? 'border-red-500' : ''
                }`}
                />
                {errors.email && (
                <p className="text-red-500 text-xs mt-1 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {errors.email}
                </p>
                )}
            </div>
            
            <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition duration-200 transform hover:scale-105 shadow-lg"
            >
                Join Chat
            </button>
            </form>

            <div className={`mt-6 text-center text-xs ${colors.textSecondary}`}>
            <p>By joining, you agree to our community guidelines</p>
            </div>
        </div>
        </div>
    );
};

export default Login;