/// admin-manage.js — Admin account management API
/// Protected by superadmin role (or shared admin secret for bootstrapping)
/// Endpoints: list admins, create admin, assign match, unassign match

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');

// Only superadmin can use these endpoints
const requireSuperAdmin = (req, res, next) => {
    if (req.adminUser?.role !== 'superadmin') {
        return res.status(403).json({ msg: 'Super-admin access required.' });
    }
    next();
};

// ── GET /api/admin/users — List all admin accounts ────────────────────────
router.get('/users', auth, requireSuperAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            where: { role: ['admin', 'superadmin'] },
            attributes: ['id', 'username', 'email', 'role', 'isLoggedIn', 'activePlatform', 'assignedMatchId']
        });

        // Enrich with assigned match name
        const enriched = await Promise.all(users.map(async (u) => {
            const data = u.toJSON();
            if (data.assignedMatchId) {
                try {
                    const match = await Match.findByPk(data.assignedMatchId);
                    data.assignedMatchName = match
                        ? `${match.teamA} vs ${match.teamB} (${match.series})`
                        : 'Match not found';
                } catch (_) { data.assignedMatchName = 'Unknown'; }
            }
            return data;
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).send('Server error: ' + err.message);
    }
});

// ── POST /api/admin/users — Create a new admin account ───────────────────
router.post('/users', auth, requireSuperAdmin, async (req, res) => {
    const { username, password, role = 'admin', assignedMatchId = null } = req.body;
    if (!username || !password) return res.status(400).json({ msg: 'Username and password required.' });

    try {
        const existing = await User.findOne({ where: { username } });
        if (existing) return res.status(400).json({ msg: 'Username already exists.' });

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        const user = await User.create({
            username,
            password: hashed,
            role,
            assignedMatchId
        });

        res.json({
            id: user.id,
            username: user.username,
            role: user.role,
            assignedMatchId: user.assignedMatchId
        });
    } catch (err) {
        res.status(500).send('Server error: ' + err.message);
    }
});

// ── PUT /api/admin/users/:id/assign — Assign a match to an admin ──────────
router.put('/users/:id/assign', auth, requireSuperAdmin, async (req, res) => {
    const { matchId } = req.body;
    if (!matchId) return res.status(400).json({ msg: 'matchId required.' });

    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found.' });
        if (user.role === 'superadmin') return res.status(400).json({ msg: 'Cannot restrict super-admin.' });

        const match = await Match.findByPk(matchId);
        if (!match) return res.status(404).json({ msg: 'Match not found.' });

        user.assignedMatchId = String(matchId);
        await user.save();

        res.json({
            msg: `Admin "${user.username}" assigned to: ${match.teamA} vs ${match.teamB}`,
            user: { id: user.id, username: user.username, assignedMatchId: user.assignedMatchId }
        });
    } catch (err) {
        res.status(500).send('Server error: ' + err.message);
    }
});

// ── PUT /api/admin/users/:id/unassign — Remove match assignment ───────────
router.put('/users/:id/unassign', auth, requireSuperAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found.' });

        user.assignedMatchId = null;
        await user.save();
        res.json({ msg: `Assignment cleared for "${user.username}".` });
    } catch (err) {
        res.status(500).send('Server error: ' + err.message);
    }
});

// ── DELETE /api/admin/users/:id — Delete an admin account ─────────────────
router.delete('/users/:id', auth, requireSuperAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found.' });
        if (user.role === 'superadmin') return res.status(400).json({ msg: 'Cannot delete super-admin.' });
        await user.destroy();
        res.json({ msg: `Admin "${user.username}" deleted.` });
    } catch (err) {
        res.status(500).send('Server error: ' + err.message);
    }
});

module.exports = router;
