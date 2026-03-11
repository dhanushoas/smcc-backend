const express = require('express');
const router = express.Router();
const TournamentRegistration = require('../models/TournamentRegistration');
const auth = require('../middleware/auth');

// @route   POST /api/tournament/register
// @desc    Public team registration
router.post('/register', async (req, res, next) => {
    try {
        const { team_name, captain_name, mobile, village } = req.body;

        // validation
        if (!team_name || !captain_name || !mobile || !village) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Indian mobile validation
        const mobileRegex = /^[6789]\d{9}$/;
        if (!mobileRegex.test(mobile)) {
            return res.status(400).json({ success: false, message: 'Invalid Indian mobile number. Must be 10 digits and start with 6, 7, 8, or 9.' });
        }

        // Check duplicates
        const existing = await TournamentRegistration.findOne({ where: { mobile } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'This mobile number is already registered for a team.' });
        }

        // Limit to 32
        const count = await TournamentRegistration.count();
        if (count >= 32) {
            return res.status(400).json({ success: false, message: 'Registration closed. All tournament slots are filled.' });
        }

        const registration = await TournamentRegistration.create({
            team_name,
            captain_name,
            mobile,
            village
        });

        res.status(201).json({
            success: true,
            message: 'Registration received successfully. Our tournament organizers will contact you soon.',
            data: registration
        });
    } catch (err) {
        next(err);
    }
});

// @route   GET /api/tournament/registrations
// @desc    Get all registrations (Admin only)
router.get('/registrations', auth, async (req, res, next) => {
    try {
        const registrations = await TournamentRegistration.findAll({
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, data: registrations });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
