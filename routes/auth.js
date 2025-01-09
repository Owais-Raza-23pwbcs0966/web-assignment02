const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/signup
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // Create token for automatic login after signup
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
});

// POST /api/signin
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: 'Error during login' });
    }
});

// GET /api/protected
router.get('/protected', auth, (req, res) => {
    try {
        // Find user by ID (set in auth middleware)
        User.findById(req.userId)
            .select('-password') // Exclude password from the response
            .then(user => {
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                res.json({
                    message: 'Protected route accessed successfully',
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
                        createdAt: user.createdAt
                    }
                });
            })
            .catch(error => {
                console.error('Protected route error:', error);
                res.status(500).json({ error: 'Error accessing protected route' });
            });

    } catch (error) {
        console.error('Protected route error:', error);
        res.status(500).json({ error: 'Error accessing protected route' });
    }
});

// Optional: GET /api/verify-token (to check if token is still valid)
// router.get('/verify-token', auth, async (req, res) => {
//     try {
//         const user = await User.findById(req.userId).select('-password');
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }
//         res.json({ valid: true, user });
//     } catch (error) {
//         res.status(401).json({ valid: false });
//     }
// });

module.exports = router;