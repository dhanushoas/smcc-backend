const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Match = require('../models/Match');

// Helper: check if admin is authorized to modify a given match
// superadmin + unassigned admins → can modify any match
// assigned admin → only their assignedMatchId
const canModifyMatch = (adminUser, matchId) => {
    if (adminUser.role === 'superadmin') return true;
    if (!adminUser.assignedMatchId) return true; // unassigned admin fallback → all matches
    return String(adminUser.assignedMatchId) === String(matchId);
};

// @route   GET api/matches
// @desc    Get all matches
// @access  Public
router.get('/', async (req, res) => {
    try {
        const matches = await Match.findAll({ order: [['date', 'DESC']] });
        res.json(matches);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/matches/:id
// @desc    Get match by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const match = await Match.findByPk(req.params.id);
        if (!match) return res.status(404).json({ msg: 'Match not found' });
        res.json(match);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/matches
// @desc    Create a match
// @access  Private (superadmin or unassigned admin)
router.post('/', auth, async (req, res) => {
    try {
        // Only superadmin / unassigned admin can create matches
        if (req.adminUser.role !== 'superadmin' && req.adminUser.assignedMatchId) {
            return res.status(403).json({
                msg: 'You are assigned to a specific match and cannot create new matches.'
            });
        }
        const match = await Match.create(req.body);
        req.app.get('socketio').emit('matchUpdate', match);
        res.json(match);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/matches/:id
// @desc    Update match (score, status, etc.)
// @access  Private — must be assigned to this match (or superadmin)
router.put('/:id', auth, async (req, res) => {
    try {
        // ── Assignment enforcement ────────────────────────────────────────
        if (!canModifyMatch(req.adminUser, req.params.id)) {
            return res.status(403).json({
                msg: `Access denied. You are assigned to match ${req.adminUser.assignedMatchId}, not this one.`,
                type: 'WRONG_MATCH'
            });
        }

        let match = await Match.findByPk(req.params.id);
        if (!match) return res.status(404).json({ msg: 'Match not found' });

        await match.update(req.body);
        match.lastUpdated = new Date();
        await match.save();

        req.app.get('socketio').emit('matchUpdate', match);
        res.json(match);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/matches/:id
// @desc    Delete a match
// @access  Private (superadmin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.adminUser.role !== 'superadmin') {
            return res.status(403).json({ msg: 'Only super-admin can delete matches.' });
        }
        const match = await Match.findByPk(req.params.id);
        if (!match) return res.status(404).json({ msg: 'Match not found' });

        const matchId = match.id;
        await match.destroy();
        req.app.get('socketio').emit('matchDeleted', matchId);
        res.json({ msg: 'Match removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
