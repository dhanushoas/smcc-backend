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
            if (req.method === 'PUT' && !req.fullPath?.includes('reverse')) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot modify a completed match',
                    data: null
                });
            }
        }

        // 2. Pause Guard: Block all PUT updates to scoring/state if paused (except to resume)
        const isPauseRequest = req.path.endsWith('/pause');
        if (match.score?.isPaused && req.method === 'PUT' && !isPauseRequest && !req.path.endsWith('/reverse')) {
            return res.status(400).json({
                success: false,
                message: 'Match is currently paused. Resume before making updates.',
                data: null
            });
        }

        const updates = req.body;

        // 3. Score & Logic Validation
        if (updates.score) {
            const { runs, wickets, overs, thisOver } = updates.score;

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

            // 4. Invalid Extra Combinations (e.g., Wide + Leg Bye)
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

        // 5. Toss Validation: Only run if explicitly updating toss via /toss or direct fields
        const isTossRequest = req.path.endsWith('/toss') || updates.tossWinnerTeamId || updates.tossDecision;
        if (isTossRequest) {
            const hasStarted = (match.score && parseFloat(match.score.overs) > 0) ||
                (match.history && match.history.length > 0) ||
                (match.innings && match.innings.some(inn => (inn.runs > 0 || (inn.batting && inn.batting.length > 0))));

            if (hasStarted) {
                return res.status(400).json({
                    success: false,
                    message: 'Toss cannot be changed after the first ball is bowled',
                    data: null
                });
            }
        }

        // 6. Reverse Action: Handled in route but can pre-check here
        if (req.path.endsWith('/reverse')) {
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
