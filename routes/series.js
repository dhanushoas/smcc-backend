const express = require('express');
const router = express.Router();
const Series = require('../models/Series');
const Match = require('../models/Match');

// Map series type to total number of scheduled matches
const SERIES_MATCH_COUNT = {
    best_of_3: 3,
    best_of_5: 5,
    best_of_7: 7,
};

// @route   GET /api/series
// @desc    Get all series
router.get('/', async (req, res, next) => {
    try {
        const series = await Series.findAll({ order: [['createdAt', 'DESC']] });
        res.json({ success: true, data: series });
    } catch (err) {
        next(err);
    }
});

// @route   POST /api/series
// @desc    Create a new series and auto-schedule all matches with +1hr increments
router.post('/', async (req, res, next) => {
    try {
        const series = await Series.create(req.body);

        // Determine total match count from series type (default 3)
        const totalMatches = SERIES_MATCH_COUNT[series.type] || 3;

        // Parse the start date/time provided by the admin
        const startDate = series.startDate ? new Date(series.startDate) : new Date();

        // Auto-generate all matches with incremented match numbers and times
        for (let i = 1; i <= totalMatches; i++) {
            // Each subsequent match is 1 hour after the previous
            const matchDate = new Date(startDate.getTime() + (i - 1) * 60 * 60 * 1000);

            await Match.create({
                title: `${series.name} - Match ${i}`,
                teamA: series.teamA,
                teamB: series.teamB,
                seriesId: series.id,
                competitionType: 'series',
                series: series.name,
                overs_per_match: series.oversPerMatch,
                totalOvers: series.oversPerMatch,
                venue: series.venue,
                date: matchDate,
                matchNumber: i,
                status: 'upcoming',
            });
        }

        res.json({ success: true, data: series });
    } catch (err) {
        next(err);
    }
});

// @route   GET /api/series/:id
// @desc    Get series by ID with all matches ordered by match number
router.get('/:id', async (req, res, next) => {
    try {
        const series = await Series.findByPk(req.params.id);
        if (!series) return res.status(404).json({ success: false, message: 'Series not found' });

        // Return matches sorted by matchNumber so home screen shows them in order
        const matches = await Match.findAll({
            where: { seriesId: series.id },
            order: [['matchNumber', 'ASC']],
        });

        res.json({ success: true, data: { ...series.toJSON(), matches } });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
