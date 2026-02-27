const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Match = require('../models/Match');

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
        if (!match) {
            return res.status(404).json({ msg: 'Match not found' });
        }
        res.json(match);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/matches
// @desc    Create a match
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
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
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        let match = await Match.findByPk(req.params.id);
        if (!match) {
            return res.status(404).json({ msg: 'Match not found' });
        }

        // Update fields
        await match.update(req.body);

        // Update lastUpdated
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
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const match = await Match.findByPk(req.params.id);

        if (!match) {
            return res.status(404).json({ msg: 'Match not found' });
        }

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
