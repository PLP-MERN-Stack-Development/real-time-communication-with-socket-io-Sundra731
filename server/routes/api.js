// server/routes/api.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// In-memory user storage (use MongoDB in production)
const users = new Map();

// Register endpoint
router.post('/auth/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // Validate input
        if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
        }

        // Check if user exists
        if (users.has(username)) {
        return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = Date.now().toString();

        // Store user
        users.set(username, {
        userId,
        username,
        email,
        password: hashedPassword,
        createdAt: new Date()
        });

        // Generate JWT
        const token = jwt.sign(
        { userId, username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
        );

        res.json({
        token,
        user: { userId, username, email }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
    });

    // Login endpoint
    router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = users.get(username);
        if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
        { userId: user.userId, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
        );

        res.json({
        token,
        user: { 
            userId: user.userId, 
            username: user.username, 
            email: user.email 
        }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
    });

    // Verify token endpoint
    router.get('/auth/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
    });

module.exports = router;