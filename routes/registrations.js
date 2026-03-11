const express = require('express');
const router = express.Router();
const TournamentRegistration = require('../models/TournamentRegistration');
const TournamentTeam = require('../models/TournamentTeam');
const PointsTable = require('../models/PointsTable');
const TournamentMatch = require('../models/TournamentMatch');
const Match = require('../models/Match');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');

// @route   GET /api/tournaments/registrations
// @desc    Get all registrations with stats (Admin only)
router.get('/registrations', auth, async (req, res, next) => {
    try {
        const registrations = await TournamentRegistration.findAll({
            order: [['createdAt', 'DESC']]
        });

        const total = registrations.length;
        const approved = registrations.filter(r => r.status === 'approved').length;
        const rejected = registrations.filter(r => r.status === 'rejected').length;

        res.json({
            success: true,
            data: registrations,
            stats: { total, approved, rejected }
        });
    } catch (err) {
        next(err);
    }
});

// @route   POST /api/tournament/register
// @desc    Public team registration
router.post('/register', async (req, res, next) => {
    try {
        const { team_name, captain_name, mobile, village } = req.body;

        if (!team_name || !captain_name || !mobile || !village) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const mobileRegex = /^[6789]\d{9}$/;
        if (!mobileRegex.test(mobile)) {
            return res.status(400).json({ success: false, message: 'Invalid Indian mobile number. Must be 10 digits and start with 6, 7, 8, or 9.' });
        }

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

        const count = await TournamentRegistration.count({ where: { status: 'approved' } });
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

// @route   PUT /api/tournaments/registrations/:id/approve
router.put('/registrations/:id/approve', auth, async (req, res, next) => {
    try {
        const registration = await TournamentRegistration.findByPk(req.params.id);
        if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

        if (registration.status === 'approved') {
            return res.status(400).json({ success: false, message: 'Already approved' });
        }

        const approvedCount = await TournamentRegistration.count({ where: { status: 'approved' } });

        // Even number rule: Check if scheduling has started
        const hasSchedulingStarted = await TournamentMatch.count() > 0;
        if (hasSchedulingStarted && (approvedCount + 1) % 2 !== 0) {
            return res.status(400).json({ success: false, message: 'Approved teams must be an even number because scheduling has already started.' });
        }

        if (approvedCount >= 32) {
            return res.status(400).json({ success: false, message: 'Already reached maximum of 32 approved teams.' });
        }

        await registration.update({ status: 'approved' });

        // Add to pool
        const team = await TournamentTeam.create({
            name: registration.team_name,
            captain: registration.captain_name,
            captainMobile: registration.mobile,
            district: registration.village
        });

        // Initialize Points Table
        await PointsTable.create({
            team_id: team.id,
            team_name: team.name
        });

        res.json({ success: true, message: 'Registration approved and team added to pool.' });
    } catch (err) {
        next(err);
    }
});

// @route   PUT /api/tournaments/registrations/:id/reject
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

// @route   DELETE /api/tournaments/registrations/:id
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

// @route   POST /api/tournaments/registrations/generate-schedule
// @desc    Generate knockout schedule for 32 teams
router.post('/registrations/generate-schedule', auth, async (req, res, next) => {
    try {
        const approvedTeams = await TournamentTeam.findAll({ limit: 32 });
        if (approvedTeams.length !== 32) {
            return res.status(400).json({ success: false, message: `Need exactly 32 teams to generate schedule. Current: ${approvedTeams.length}` });
        }

        // Clear existing matches
        await TournamentMatch.destroy({ where: {} });

        // Shuffle teams
        const shuffled = approvedTeams.sort(() => 0.5 - Math.random());

        // Round 1 (16 matches)
        const round1Matches = [];
        for (let i = 0; i < 16; i++) {
            const team1 = shuffled[i * 2];
            const team2 = shuffled[i * 2 + 1];

            const tournamentMatch = await TournamentMatch.create({
                round: 'Round 1',
                match_number: i + 1,
                team1_id: team1.id,
                team2_id: team2.id,
                team1_name: team1.name,
                team2_name: team2.name,
                next_match_number: Math.floor(i / 2) + 17, // Matches 17-24 are Round 2
                next_match_position: (i % 2 === 0) ? '1' : '2'
            });

            // Create actual match entry
            await Match.create({
                title: `Round 1 - Match ${i + 1}`,
                teamA: team1.name,
                teamB: team2.name,
                competitionType: 'tournament',
                tournamentRound: 'Round 1',
                matchNumber: i + 1,
                status: 'upcoming'
            });
        }

        // Placeholder for future rounds (17-31)
        // Round 2 (8 matches: 17-24)
        for (let i = 17; i <= 24; i++) {
            await TournamentMatch.create({
                round: 'Round 2',
                match_number: i,
                next_match_number: Math.floor((i - 17) / 2) + 25, // 25-28 QF
                next_match_position: ((i - 17) % 2 === 0) ? '1' : '2'
            });
        }
        // QF (4 matches: 25-28)
        for (let i = 25; i <= 28; i++) {
            await TournamentMatch.create({
                round: 'Quarter Final',
                match_number: i,
                next_match_number: Math.floor((i - 25) / 2) + 29, // 29-30 SF
                next_match_position: ((i - 25) % 2 === 0) ? '1' : '2'
            });
        }
        // SF (2 matches: 29-30)
        for (let i = 29; i <= 30; i++) {
            await TournamentMatch.create({
                round: 'Semi Final',
                match_number: i,
                next_match_number: 31, // 31 Final
                next_match_position: ((i - 29) % 2 === 0) ? '1' : '2'
            });
        }
        // Final (1 match: 31)
        await TournamentMatch.create({
            round: 'Final',
            match_number: 31
        });

        res.json({ success: true, message: 'Tournament schedule generated successfully for 32 teams.' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
