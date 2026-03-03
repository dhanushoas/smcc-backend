const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const matchValidator = require('../middleware/matchValidator');
const Match = require('../models/Match');

// @route   GET api/matches
// @desc    Get all matches
// @access  Public
router.get('/', async (req, res) => {
    try {
        const matches = await Match.findAll({ order: [['date', 'DESC']] });
        res.json({
            success: true,
            message: 'Matches fetched successfully',
            data: matches
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error fetching matches',
            data: null
        });
    }
});

// @route   GET api/matches/:id
// @desc    Get match by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const match = await Match.findByPk(req.params.id);
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found',
                data: null
            });
        }
        res.json({
            success: true,
            message: 'Match fetched successfully',
            data: match
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error fetching match by ID',
            data: null
        });
    }
});

// @route   POST api/matches
// @desc    Create a match
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const match = await Match.create(req.body);
        req.app.get('socketio').emit('matchUpdate', match);
        res.status(201).json({
            success: true,
            message: 'Match created successfully',
            data: match
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error creating match',
            data: null
        });
    }
});

// @route   PUT api/matches/:id
// @desc    Update match (score, status, etc.)
// @access  Private
router.put('/:id', auth, matchValidator, async (req, res) => {
    try {
        // matchValidator already fetched and attached match to req
        let match = req.match;

        // Update fields
        await match.update(req.body);

        // Update lastUpdated
        match.lastUpdated = new Date();
        await match.save();

        req.app.get('socketio').emit('matchUpdate', match);
        res.json({
            success: true,
            message: 'Match updated successfully',
            data: match
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error updating match',
            data: null
        });
    }
});

// @route   PUT api/matches/:id/reverse
// @desc    Reverse last action (Undo)
// @access  Private
router.put('/:id/reverse', auth, matchValidator, async (req, res) => {
    try {
        let match = req.match;

        if (!match.history || match.history.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No history to reverse',
                data: null
            });
        }

        const history = [...match.history];
        const lastState = history.pop();

        // Revert to last state from history
        match.score = lastState.score;
        match.currentBatsmen = lastState.currentBatsmen;
        match.currentBowler = lastState.currentBowler;
        match.innings = lastState.innings;
        match.status = lastState.status || match.status;
        match.history = history;
        match.lastUpdated = new Date();

        await match.save();
        req.app.get('socketio').emit('matchUpdate', match);
        res.json({
            success: true,
            message: 'Action reversed successfully',
            data: match
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error reversing last action',
            data: null
        });
    }
});

// @route   PUT api/matches/:id/pause
// @desc    Pause or Resume match
// @access  Private
router.put('/:id/pause', auth, matchValidator, async (req, res) => {
    try {
        let match = req.match;
        const { isPaused, pauseReason } = req.body;

        if (!match.score) match.score = {};
        match.score.isPaused = isPaused;
        match.score.pauseReason = isPaused ? (pauseReason || 'Paused by Admin') : '';
        match.lastUpdated = new Date();

        await match.save();
        req.app.get('socketio').emit('matchUpdate', match);
        res.json({
            success: true,
            message: isPaused ? 'Match paused successfully' : 'Match resumed successfully',
            data: match
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error during pause/resume toggle',
            data: null
        });
    }
});

// @route   DELETE api/matches/:id
// @desc    Delete a match
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const match = await Match.findByPk(req.params.id);

        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found',
                data: null
            });
        }

        const matchId = match.id;
        await match.destroy();
        req.app.get('socketio').emit('matchDeleted', matchId);
        res.json({
            success: true,
            message: 'Match deleted successfully',
            data: { id: matchId }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error deleting match',
            data: null
        });
    }
});

module.exports = router;

