const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const matchValidator = require('../middleware/matchValidator');
const Match = require('../models/Match');

// Fetch all matches ordered by date descending
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

// Fetch a single match details by primary key
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

// Create a new match record and broadcast via Socket.io
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

// Update general match metadata (title, venue, date)
router.put('/:id', auth, matchValidator, async (req, res) => {
    try {
        let match = req.match;

        // Strip toss fields to prevent unintended validation triggers in matchValidator
        delete req.body.toss;
        delete req.body.tossWinnerTeamId;
        delete req.body.tossDecision;

        await match.update(req.body);
        match.lastUpdated = new Date();
        await match.save();

        req.app.get('socketio').emit('matchUpdate', match);
        res.json({ success: true, message: 'Match updated successfully', data: match });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server Error updating match', data: null });
    }
});

// Update real-time scoring data and innings state
router.put('/:id/score', auth, matchValidator, async (req, res) => {
    try {
        let match = req.match;

        // Strictly strip toss to isolate logic
        delete req.body.toss;
        delete req.body.tossWinnerTeamId;
        delete req.body.tossDecision;

        // Primary scoring updates
        if (req.body.score) match.score = req.body.score;
        if (req.body.innings) match.innings = req.body.innings;
        if (req.body.currentBatsmen) match.currentBatsmen = req.body.currentBatsmen;
        if (req.body.currentBowler) match.currentBowler = req.body.currentBowler;
        if (req.body.history) match.history = req.body.history;
        if (req.body.status) match.status = req.body.status;
        if (req.body.manOfTheMatch !== undefined) match.manOfTheMatch = req.body.manOfTheMatch;

        match.lastUpdated = new Date();
        match.changed('score', true);
        match.changed('innings', true);
        match.changed('history', true); // Force sequelize to detect JSON changes

        await match.save();

        req.app.get('socketio').emit('matchUpdate', match);
        res.json({
            success: true,
            message: 'Score updated successfully',
            data: match
        });
    } catch (err) {
        console.error('Scoring update error:', err);
        res.status(500).json({ success: false, message: 'Server error updating score', data: null });
    }
});

// Revert the last scoring action from match history
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

// Toggle match pause state with reason
router.put('/:id/pause', auth, matchValidator, async (req, res) => {
    try {
        let match = req.match;
        const { reason } = req.body;

        // Toggle logic: If currently paused, resume. If not, pause.
        const currentlyPaused = match.score?.isPaused || false;
        const newPauseState = !currentlyPaused;

        if (newPauseState && !reason) {
            return res.status(400).json({
                success: false,
                message: 'Pause reason is required',
                data: null
            });
        }

        if (!match.score) match.score = {};
        match.score.isPaused = newPauseState;
        match.score.pauseReason = newPauseState ? reason : '';
        match.lastUpdated = new Date();

        // Mark as "changed" for Sequelize to detect updates in JSON field
        match.changed('score', true);
        await match.save();

        req.app.get('socketio').emit('matchUpdate', match);
        res.json({
            success: true,
            message: newPauseState ? 'Match paused successfully' : 'Match resumed successfully',
            data: match
        });
    } catch (err) {
        console.error('Pause Toggle Error:', err);
        res.status(500).json({
            success: false,
            message: 'Server Error during pause/resume toggle',
            data: null
        });
    }
});

// Record toss results and determine initial batting team
router.put('/:id/toss', auth, matchValidator, async (req, res) => {
    try {
        let match = req.match;
        const { tossWinnerTeamId, tossDecision } = req.body;

        if (!tossWinnerTeamId || !tossDecision) {
            return res.status(400).json({
                success: false,
                message: 'Toss winner and decision are required',
                data: null
            });
        }

        if (!['BAT', 'BOWL'].includes(tossDecision.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid toss decision. Must be BAT or BOWL',
                data: null
            });
        }

        // Validate team belongs to match
        if (tossWinnerTeamId !== match.teamA && tossWinnerTeamId !== match.teamB) {
            return res.status(400).json({
                success: false,
                message: 'Selected team does not belong to this match',
                data: null
            });
        }

        const opposition = (tossWinnerTeamId === match.teamA) ? match.teamB : match.teamA;
        const battingTeam = (tossDecision.toUpperCase() === 'BAT') ? tossWinnerTeamId : opposition;

        match.toss = {
            winner: tossWinnerTeamId,
            decision: tossDecision.toLowerCase()
        };

        if (!match.score) match.score = {};
        match.score.battingTeam = battingTeam;
        match.lastUpdated = new Date();

        match.changed('toss', true);
        match.changed('score', true);
        await match.save();

        req.app.get('socketio').emit('matchUpdate', match);
        res.json({
            success: true,
            message: 'Toss updated successfully',
            data: match
        });
    } catch (err) {
        console.error('Toss Update Error:', err);
        res.status(500).json({
            success: false,
            message: 'Server Error updating toss',
            data: null
        });
    }
});

// Permanently remove a match record and notify clients
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

