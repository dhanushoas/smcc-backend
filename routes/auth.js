const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const passport = require('passport');

const getIO = (req) => req.app.get('socketio');

// ─── POST /api/auth/login ──────────────────────────────────────────────────
// Accepts { username, password, platform: 'web' | 'mobile' }
// If admin is already logged in on another platform → force-logout that platform,
// then issue a new token for the new platform.
router.post('/login', async (req, res) => {
    const { username, password, platform } = req.body;
    const incomingPlatform = platform || 'web';

    try {
        let user = await User.findOne({ where: { username } });

        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        if (!user.password)
            return res.status(400).json({ msg: 'This account uses Google Login.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        // ── Cross-platform force-logout ────────────────────────────────────
        if (user.role === 'admin' && user.isLoggedIn && user.activePlatform && user.activePlatform !== incomingPlatform) {
            // Notify the OLD platform to log out immediately via socket
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
            if (err) return res.status(500).json({ msg: 'Token generation failed' });

            // Update session fields
            user.isLoggedIn = true;
            user.activePlatform = incomingPlatform;
            user.activeToken = token;
            await user.save();

            console.log(`Admin logged in on platform: ${incomingPlatform}`);

            res.json({
                token,
                user: { id: user.id, role: user.role },
                platform: incomingPlatform
            });
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('Server error: ' + err.message);
    }
});

// ─── GET /api/auth/verify ──────────────────────────────────────────────────
// Validates token AND checks it matches the activeToken in DB (stale tokens rejected)
router.get('/verify', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ msg: 'No token' });

    const token = authHeader.replace('Bearer ', '').trim();
    const jwtSecret = process.env.JWT_SECRET || 'smccsecrettoken123_fallback';

    try {
        const decoded = jwt.verify(token, jwtSecret);
        const user = await User.findByPk(decoded.user.id);

        if (!user || !user.isLoggedIn)
            return res.status(401).json({ msg: 'Session ended' });

        // Stale token check — token must match the one stored in DB
        if (user.activeToken !== token)
            return res.status(401).json({ msg: 'Session superseded by another platform' });

        res.json({ valid: true, platform: user.activePlatform, user: { id: user.id, role: user.role } });
    } catch (err) {
        // JWT expired
        if (err.name === 'TokenExpiredError') {
            // Clear DB session on expiry
            try {
                const decoded = jwt.decode(token);
                if (decoded?.user?.id) {
                    const user = await User.findByPk(decoded.user.id);
                    if (user) {
                        user.isLoggedIn = false;
                        user.activePlatform = null;
                        user.activeToken = null;
                        await user.save();
                        // Notify all platforms that the session expired
                        req.app.get('socketio').emit('adminSessionExpired', {});
                    }
                }
            } catch (_) { }
            return res.status(401).json({ msg: 'Token expired' });
        }
        res.status(401).json({ msg: 'Invalid token' });
    }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ msg: 'User ID required' });

        const user = await User.findByPk(userId);
        if (user) {
            user.isLoggedIn = false;
            user.activePlatform = null;
            user.activeToken = null;
            await user.save();
            getIO(req).emit('adminSessionEnded', {});
            return res.json({ msg: 'Logged out successfully' });
        }
        res.status(404).json({ msg: 'User not found' });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// ─── POST /api/auth/reset-session ─────────────────────────────────────────
// Emergency: force-clear a locked session by re-entering credentials
router.post('/reset-session', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ where: { username } });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        user.isLoggedIn = false;
        user.activePlatform = null;
        user.activeToken = null;
        await user.save();

        getIO(req).emit('adminForceLogout', { platform: 'all', reason: 'Session reset' });
        res.json({ msg: 'Session reset. You can now login.' });
    } catch (err) {
        res.status(500).send('Server error');
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
