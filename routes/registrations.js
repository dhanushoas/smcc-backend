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

        const { Op } = require('sequelize');
        const existing = await TournamentRegistration.findOne({
            where: {
                [Op.or]: [
                    { mobile },
                    {
                        team_name: { [Op.iLike]: team_name.trim() },
                        captain_name: { [Op.iLike]: captain_name.trim() }
                    }
                ]
            }
        });

        if (existing) {
            let msg = 'This team or mobile is already registered.';
            if (existing.mobile === mobile) msg = 'This mobile number is already registered.';
            else msg = 'A team with this name and captain is already registered.';
            return res.status(400).json({ success: false, message: msg });
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

// @route   PUT /api/tournament/registrations/:id/approve
// @desc    Approve registration and create TournamentTeam (Admin only)
router.put('/registrations/:id/approve', auth, async (req, res, next) => {
    try {
        const registration = await TournamentRegistration.findByPk(req.params.id);
        if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

        if (registration.status === 'approved') {
            return res.status(400).json({ success: false, message: 'Already approved' });
        }

        // Update status
        await registration.update({ status: 'approved' });

        // Create TournamentTeam (Pool)
        const TournamentTeam = require('../models/TournamentTeam');
        await TournamentTeam.create({
            name: registration.team_name,
            captain: registration.captain_name,
            captainMobile: registration.mobile,
            district: registration.village
        });

        res.json({ success: true, message: 'Registration approved and team added to pool.' });
    } catch (err) {
        next(err);
    }
});

// @route   PUT /api/tournament/registrations/:id/reject
// @desc    Reject registration (Admin only)
router.put('/registrations/:id/reject', auth, async (req, res, next) => {
    try {
        const registration = await TournamentRegistration.findByPk(req.params.id);
        if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

        await registration.update({ status: 'rejected' });
        res.json({ success: true, message: 'Registration rejected.' });
    } catch (err) {
        next(err);
    }
});

// @route   DELETE /api/tournament/registrations/:id
// @desc    Delete registration (Admin only)
router.delete('/registrations/:id', auth, async (req, res, next) => {
    try {
        const registration = await TournamentRegistration.findByPk(req.params.id);
        if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

        await registration.destroy();
        res.json({ success: true, message: 'Registration deleted.' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
