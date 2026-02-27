const express = require('express');
const router = express.Router();
const Interaction = require('../models/Interaction');

// Submit an interaction
router.post('/submit', async (req, res) => {
    try {
        const { type, name, email, subject, message, data } = req.body;
        const interaction = await Interaction.create({
            type, name, email, subject, message, data
        });
        res.status(201).json({ msg: 'Submitted successfully', id: interaction.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Get all interactions (Admin only - though I won't add middleware yet for simplicity unless asked)
router.get('/all', async (req, res) => {
    try {
        const interactions = await Interaction.findAll({ order: [['createdAt', 'DESC']] });
        res.json(interactions);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
