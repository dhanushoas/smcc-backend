const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const passport = require('passport');

const getIO = (req) => req.app.get('socketio');

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { username, password, platform } = req.body;
    const incomingPlatform = platform || 'web';

    try {
        let user = await User.findOne({ where: { username } });

        if (!user) return res.status(400).json({
            success: false,
            message: 'Invalid Credentials',
            data: null
        });

        if (!user.password)
            return res.status(400).json({
                success: false,
                message: 'This account uses Google Login.',
                data: null
            });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({
            success: false,
            message: 'Invalid Credentials',
            data: null
        });

        // ── Cross-platform force-logout ────────────────────────────────────
        if (user.role === 'admin' && user.isLoggedIn && user.activePlatform && user.activePlatform !== incomingPlatform) {
            getIO(req).emit('adminForceLogout', {
                platform: user.activePlatform,
                reason: `Session taken over by ${incomingPlatform}`
            });
            console.log(`Force-logout sent to platform: ${user.activePlatform}`);
        }

        // ── Generate new JWT ───────────────────────────────────────────────
        const jwtSecret = process.env.JWT_SECRET || 'smccsecrettoken123_fallback';
        const payload = { user: { id: user.id, role: user.role } };

        jwt.sign(payload, jwtSecret, { expiresIn: '100h' }, async (err, token) => {
            if (err) return res.status(500).json({
                success: false,
                message: 'Token generation failed',
                data: null
            });

            // Update session fields
            user.isLoggedIn = true;
            user.activePlatform = incomingPlatform;
            user.activeToken = token;
            await user.save();

            console.log(`Admin logged in on platform: ${incomingPlatform}`);

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: { id: user.id, role: user.role },
                    platform: incomingPlatform
                }
            });
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            data: null
        });
    }
});

// ─── GET /api/auth/verify ──────────────────────────────────────────────────
router.get('/verify', async (req, res) => {
    let token = req.header('x-auth-token');
    const authHeader = req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '').trim();
    }

    if (!token) return res.status(401).json({
        success: false,
        message: 'No token, authorization denied',
        data: null
    });

    const jwtSecret = process.env.JWT_SECRET || 'smccsecrettoken123_fallback';

    try {
        const decoded = jwt.verify(token, jwtSecret);
        const user = await User.findByPk(decoded.user.id);

        if (!user || !user.isLoggedIn)
            return res.status(401).json({
                success: false,
                message: 'Session ended',
                data: null
            });

        // Stale token check — token must match the one stored in DB
        if (user.activeToken !== token)
            return res.status(401).json({
                success: false,
                message: 'Session superseded by another platform',
                data: null
            });

        res.json({
            success: true,
            message: 'Token valid',
            data: { valid: true, platform: user.activePlatform, user: { id: user.id, role: user.role } }
        });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            try {
                const decoded = jwt.decode(token);
                if (decoded?.user?.id) {
                    const user = await User.findByPk(decoded.user.id);
                    if (user) {
                        user.isLoggedIn = false;
                        user.activePlatform = null;
                        user.activeToken = null;
                        await user.save();
                        req.app.get('socketio').emit('adminSessionExpired', {});
                    }
                }
            } catch (_) { }
            return res.status(401).json({
                success: false,
                message: 'Token expired',
                data: null
            });
        }
        res.status(401).json({
            success: false,
            message: 'Invalid token',
            data: null
        });
    }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({
            success: false,
            message: 'User ID required',
            data: null
        });

        const user = await User.findByPk(userId);
        if (user) {
            user.isLoggedIn = false;
            user.activePlatform = null;
            user.activeToken = null;
            await user.save();
            getIO(req).emit('adminSessionEnded', {});
            return res.json({
                success: true,
                message: 'Logged out successfully',
                data: null
            });
        }
        res.status(404).json({
            success: false,
            message: 'User not found',
            data: null
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error during logout',
            data: null
        });
    }
});

// ─── POST /api/auth/reset-session ─────────────────────────────────────────
router.post('/reset-session', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ where: { username } });
        if (!user) return res.status(400).json({
            success: false,
            message: 'Invalid Credentials',
            data: null
        });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({
            success: false,
            message: 'Invalid Credentials',
            data: null
        });

        user.isLoggedIn = false;
        user.activePlatform = null;
        user.activeToken = null;
        await user.save();

        getIO(req).emit('adminForceLogout', { platform: 'all', reason: 'Session reset' });
        res.json({
            success: true,
            message: 'Session reset. You can now login.',
            data: null
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error during session reset',
            data: null
        });
    }
});

// ─── Google OAuth ──────────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const jwtSecret = process.env.JWT_SECRET || 'smccsecrettoken123_fallback';
        const payload = { user: { id: req.user.id, role: req.user.role } };
        jwt.sign(payload, jwtSecret, { expiresIn: '100h' }, (err, token) => {
            if (err) return res.status(500).send('Token generation failed');
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/google-auth?token=${token}`);
        });
    }
);

module.exports = router;
