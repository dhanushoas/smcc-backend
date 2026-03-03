const Match = require('../models/Match');

/**
 * Centralized validator for Match updates
 * Ensures match logic is enforced on the server side
 */
const matchValidator = async (req, res, next) => {
    try {
        const matchId = req.params.id;
        const match = await Match.findByPk(matchId);

        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found',
                data: null
            });
        }

        // 1. Status Based Restrictions
        if (match.status === 'completed' && !req.path.includes('all')) {
            // Allow fetching, but block scoring updates on completed matches
            if (req.method === 'PUT' && !req.path.includes('reverse')) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot modify a completed match',
                    data: null
                });
            }
        }

        const updates = req.body;

        // 2. Score & Logic Validation
        if (updates.score) {
            const { runs, wickets, overs, isPaused, thisOver } = updates.score;

            // No negative runs
            if (runs < 0) {
                return res.status(400).json({ success: false, message: 'Runs cannot be negative', data: null });
            }

            // Wickets cannot exceed 10
            if (wickets > 10) {
                return res.status(400).json({ success: false, message: 'Wickets cannot exceed 10', data: null });
            }

            // Overs cannot exceed match limit (with 0.6 ball check)
            if (overs) {
                const totalMatchOvers = match.totalOvers || 20;
                const oversFloat = parseFloat(overs);
                const wholeOvers = Math.floor(oversFloat);
                const balls = Math.round((oversFloat - wholeOvers) * 10);

                if (balls > 6) {
                    return res.status(400).json({ success: false, message: 'Invalid ball count (max .6)', data: null });
                }

                if (wholeOvers > totalMatchOvers || (wholeOvers === totalMatchOvers && balls > 0)) {
                    return res.status(400).json({ success: false, message: `Overs cannot exceed match limit: ${totalMatchOvers}`, data: null });
                }
            }

            // Pause Logic: Cannot pause if completed
            if (isPaused && match.status === 'completed') {
                return res.status(400).json({ success: false, message: 'Cannot pause a completed match', data: null });
            }

            // 3. Invalid Extra Combinations (e.g., Wide + Leg Bye)
            if (thisOver && Array.isArray(thisOver)) {
                for (const ball of thisOver) {
                    if (ball.type === 'w' && (ball.lb > 0 || ball.b > 0)) {
                        return res.status(400).json({
                            success: false,
                            message: 'Invalid combination: Wide cannot have Byes or Leg Byes',
                            data: null
                        });
                    }
                }
            }
        }

        // 4. Toss Validation: Cannot change after match starts (balls bowled)
        if (updates.toss) {
            const hasStarted = (match.score && parseFloat(match.score.overs) > 0) || (match.history && match.history.length > 0);
            if (hasStarted) {
                return res.status(400).json({ success: false, message: 'Toss cannot be changed after the first ball is bowled', data: null });
            }
        }

        // 5. Reverse Action: Handled in route but can pre-check here
        if (req.path.includes('reverse')) {
            if (!match.history || match.history.length === 0) {
                return res.status(400).json({ success: false, message: 'Reverse cannot run if no history exists', data: null });
            }
        }

        // Attach match to request
        req.match = match;
        next();
    } catch (err) {
        console.error('Match Validator Error:', err);
        res.status(500).json({ success: false, message: 'Server error during validation', data: null });
    }
};

module.exports = matchValidator;
