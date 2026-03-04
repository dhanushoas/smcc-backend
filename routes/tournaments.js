const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const TournamentTeam = require('../models/TournamentTeam');
const TournamentGroup = require('../models/TournamentGroup');
const Match = require('../models/Match');

// Helper: parse "10:00 AM" + base date + offset minutes → ISO date
function buildMatchDateTime(baseDateStr, timeStr, offsetMinutes) {
    // baseDateStr: ISO date string from tournament.startDate
    // timeStr: "HH:MM AM/PM" string from tournament.startTime
    const base = baseDateStr ? new Date(baseDateStr) : new Date();
    const [timePart, meridiem] = (timeStr || '09:00 AM').split(' ');
    let [h, m] = timePart.split(':').map(Number);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    base.setHours(h, m, 0, 0);
    return new Date(base.getTime() + offsetMinutes * 60 * 1000);
}

// @route   GET /api/tournaments
// @desc    Get all tournaments
router.get('/', async (req, res, next) => {
    try {
        const tournaments = await Tournament.findAll({ order: [['createdAt', 'DESC']] });
        res.json({ success: true, data: tournaments });
    } catch (err) {
        next(err);
    }
});

// @route   POST /api/tournaments
// @desc    Create Tournament
router.post('/', async (req, res, next) => {
    try {
        const tournament = await Tournament.create(req.body);
        res.json({ success: true, data: tournament });
    } catch (err) {
        next(err);
    }
});

// @route   GET /api/tournaments/:id
// @desc    Get Tournament with teams, groups, matches
router.get('/:id', async (req, res, next) => {
    try {
        const tournament = await Tournament.findByPk(req.params.id);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const teams = await TournamentTeam.findAll({ where: { tournamentId: req.params.id } });
        const groups = await TournamentGroup.findAll({ where: { tournamentId: req.params.id } });
        const matches = await Match.findAll({
            where: { tournamentId: req.params.id },
            order: [['date', 'ASC'], ['matchNumber', 'ASC']]
        });

        res.json({
            success: true,
            data: { ...tournament.toJSON(), teams, groups, matches }
        });
    } catch (err) {
        next(err);
    }
});

// @route   POST /api/tournaments/:id/teams
// @desc    Register Team to Tournament
router.post('/:id/teams', async (req, res, next) => {
    try {
        const team = await TournamentTeam.create({
            ...req.body,
            tournamentId: req.params.id
        });
        res.json({ success: true, data: team });
    } catch (err) {
        next(err);
    }
});

// @route   PUT /api/tournaments/:id/teams/:teamId
// @desc    Update Team (Players, Captain, District, etc.)
router.put('/:id/teams/:teamId', async (req, res, next) => {
    try {
        const team = await TournamentTeam.findOne({ where: { id: req.params.teamId, tournamentId: req.params.id } });
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
        await team.update(req.body);
        res.json({ success: true, data: team });
    } catch (err) {
        next(err);
    }
});

// @route   DELETE /api/tournaments/:id/teams/:teamId
// @desc    Remove Team
router.delete('/:id/teams/:teamId', async (req, res, next) => {
    try {
        await TournamentTeam.destroy({ where: { id: req.params.teamId, tournamentId: req.params.id } });
        res.json({ success: true, message: 'Team removed' });
    } catch (err) {
        next(err);
    }
});

// @route   POST /api/tournaments/:id/generate-groups
// @desc    Auto-generate groups and distribute teams
router.post('/:id/generate-groups', async (req, res, next) => {
    try {
        const tournament = await Tournament.findByPk(req.params.id);
        const teams = await TournamentTeam.findAll({ where: { tournamentId: req.params.id } });

        if (teams.length < 2) {
            return res.status(400).json({ success: false, message: `Need at least 2 teams registered, currently have ${teams.length}` });
        }

        // Determine number of groups: 8→2, 12→3, 16→4, 20→4, 24→6, 32→8
        let numGroups = 2;
        const t = tournament.totalTeams;
        if (t === 12) numGroups = 3;
        else if (t === 16 || t === 20) numGroups = 4;
        else if (t === 24) numGroups = 6;
        else if (t === 32) numGroups = 8;
        else numGroups = Math.max(2, Math.floor(Math.sqrt(t)));

        // Clear old groups and group assignments
        await TournamentGroup.destroy({ where: { tournamentId: req.params.id } });
        await TournamentTeam.update({ groupId: null }, { where: { tournamentId: req.params.id } });

        // Create new groups
        const groups = [];
        for (let i = 0; i < numGroups; i++) {
            const group = await TournamentGroup.create({
                name: `Group ${String.fromCharCode(65 + i)}`,
                tournamentId: req.params.id
            });
            groups.push(group);
        }

        // Distribute teams round-robin across groups
        for (let i = 0; i < teams.length; i++) {
            teams[i].groupId = groups[i % numGroups].id;
            await teams[i].save();
        }

        res.json({ success: true, message: `${numGroups} groups generated with ${teams.length} teams distributed` });
    } catch (err) {
        next(err);
    }
});

// @route   POST /api/tournaments/:id/generate-schedule
// @desc    Generate round-robin schedule for all groups, with auto time-slot assignment
router.post('/:id/generate-schedule', async (req, res, next) => {
    try {
        const tournament = await Tournament.findByPk(req.params.id);
        const groups = await TournamentGroup.findAll({ where: { tournamentId: req.params.id } });

        if (groups.length === 0) {
            return res.status(400).json({ success: false, message: 'Generate groups first before creating a schedule.' });
        }

        // Delete existing group-stage matches
        await Match.destroy({ where: { tournamentId: req.params.id, tournamentRound: 'group' } });

        const overs = tournament.settings?.oversPerMatch || 20;
        const gap = tournament.matchGapMinutes || 60;

        let matchCounter = 1;
        let slotOffset = 0; // offset in minutes from start time

        for (const group of groups) {
            const teams = await TournamentTeam.findAll({ where: { groupId: group.id } });

            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    // Assign date/time slot based on match index and gap
                    const matchDate = buildMatchDateTime(tournament.startDate, tournament.startTime, slotOffset);

                    await Match.create({
                        title: `${teams[i].name} vs ${teams[j].name}`,
                        teamA: teams[i].name,
                        teamB: teams[j].name,
                        teamASquad: Array.isArray(teams[i].players) ? teams[i].players.map(p => p.name || p) : [],
                        teamBSquad: Array.isArray(teams[j].players) ? teams[j].players.map(p => p.name || p) : [],
                        overs_per_match: overs,
                        totalOvers: overs,
                        venue: tournament.venue || 'SMCC Ground',
                        tournamentId: tournament.id,
                        groupId: group.id,
                        tournamentRound: 'group',
                        matchNumber: matchCounter++,
                        competitionType: 'tournament',
                        status: 'upcoming',
                        date: matchDate,
                    });

                    slotOffset += gap; // next match is `gap` minutes later
                }
            }
        }

        res.json({ success: true, message: `Schedule generated: ${matchCounter - 1} matches across ${groups.length} groups` });
    } catch (err) {
        next(err);
    }
});

// @route   GET /api/tournaments/:id/points-table
// @desc    Calculate and return points table by group
router.get('/:id/points-table', async (req, res, next) => {
    try {
        const groups = await TournamentGroup.findAll({ where: { tournamentId: req.params.id } });
        const pointsTable = [];

        for (const group of groups) {
            const teams = await TournamentTeam.findAll({ where: { groupId: group.id } });
            const groupData = { groupName: group.name, teamStats: [] };

            for (const team of teams) {
                const allGroupMatches = await Match.findAll({
                    where: { tournamentId: req.params.id, groupId: group.id, status: 'completed' }
                });
                const teamMatches = allGroupMatches.filter(m => m.teamA === team.name || m.teamB === team.name);

                let wins = 0, losses = 0, ties = 0, points = 0;
                let runsScored = 0, oversFaced = 0, runsConceded = 0, oversBowled = 0;

                teamMatches.forEach(m => {
                    const winner = m.score?.winner;
                    if (winner === team.name) { wins++; points += 2; }
                    else if (winner === 'tie') { ties++; points += 1; }
                    else if (winner) { losses++; }

                    if (m.innings?.length >= 2) {
                        const tI = m.innings.find(inn => inn.team === team.name);
                        const oI = m.innings.find(inn => inn.team !== team.name);
                        if (tI && oI) {
                            runsScored += tI.runs || 0;
                            oversFaced += tI.overs || 0;
                            runsConceded += oI.runs || 0;
                            oversBowled += oI.overs || 0;
                        }
                    }
                });

                const nrr = (oversFaced > 0 && oversBowled > 0)
                    ? (runsScored / oversFaced) - (runsConceded / oversBowled)
                    : 0;

                groupData.teamStats.push({
                    teamName: team.name,
                    captain: team.captain || '',
                    district: team.district || '',
                    matches: teamMatches.length,
                    wins, losses, ties, points,
                    nrr: nrr.toFixed(3)
                });
            }

            // Sort by points descending, then NRR
            groupData.teamStats.sort((a, b) => b.points - a.points || Number(b.nrr) - Number(a.nrr));
            pointsTable.push(groupData);
        }

        res.json({ success: true, data: pointsTable });
    } catch (err) {
        next(err);
    }
});

// @route   POST /api/tournaments/:id/generate-knockouts
// @desc    Generate knockout bracket from group standings
router.post('/:id/generate-knockouts', async (req, res, next) => {
    try {
        const tournament = await Tournament.findByPk(req.params.id);
        const groups = await TournamentGroup.findAll({ where: { tournamentId: req.params.id } });

        if (groups.length === 0) {
            return res.status(400).json({ success: false, message: 'No groups found.' });
        }

        // Calculate standings per group
        const standings = [];
        for (const group of groups) {
            const teams = await TournamentTeam.findAll({ where: { groupId: group.id } });
            const teamStats = [];
            for (const team of teams) {
                const matches = await Match.findAll({ where: { tournamentId: req.params.id, groupId: group.id, status: 'completed' } });
                const teamMatches = matches.filter(m => m.teamA === team.name || m.teamB === team.name);
                let points = 0, runsScored = 0, oversFaced = 0, runsConceded = 0, oversBowled = 0;
                teamMatches.forEach(m => {
                    if (m.score?.winner === team.name) points += 2;
                    else if (m.score?.winner === 'tie') points += 1;
                    if (m.innings?.length >= 2) {
                        const tI = m.innings.find(i => i.team === team.name);
                        const oI = m.innings.find(i => i.team !== team.name);
                        if (tI && oI) { runsScored += tI.runs || 0; oversFaced += tI.overs || 0; runsConceded += oI.runs || 0; oversBowled += oI.overs || 0; }
                    }
                });
                const nrr = (oversFaced > 0 && oversBowled > 0) ? (runsScored / oversFaced) - (runsConceded / oversBowled) : 0;
                teamStats.push({ name: team.name, points, nrr });
            }
            teamStats.sort((a, b) => b.points - a.points || b.nrr - a.nrr);
            standings.push({ groupId: group.id, groupName: group.name, topTeams: teamStats });
        }

        // Determine round name and qualified team count
        let roundName = 'Quarter Final';
        let numQualified = 8;
        if (tournament.totalTeams <= 8) { roundName = 'Semi Final'; numQualified = 4; }
        else if (tournament.totalTeams >= 32) { roundName = 'Round of 16'; numQualified = 16; }

        const teamsPerGroup = Math.ceil(numQualified / standings.length);
        const qualifiedTeams = [];
        standings.forEach(s => {
            for (let i = 0; i < teamsPerGroup && s.topTeams[i]; i++) {
                qualifiedTeams.push({ ...s.topTeams[i], groupName: s.groupName, rank: i + 1 });
            }
        });

        if (qualifiedTeams.length < 4) {
            return res.status(400).json({ success: false, message: `Need at least 4 qualified teams. Ensure group matches are completed.` });
        }

        // Remove old knockout matches for this round
        await Match.destroy({ where: { tournamentId: req.params.id, tournamentRound: roundName } });

        // Cross-pairing: top from group A vs 2nd from group B, etc.
        const halfLen = Math.floor(qualifiedTeams.length / 2);
        const scheduleOffset = 0;
        for (let i = 0; i < halfLen; i++) {
            const team1 = qualifiedTeams[i];
            const team2 = qualifiedTeams[qualifiedTeams.length - 1 - i];
            const matchDate = buildMatchDateTime(tournament.startDate, tournament.startTime, scheduleOffset + i * (tournament.matchGapMinutes || 60));
            await Match.create({
                title: `${roundName}: ${team1.name} vs ${team2.name}`,
                teamA: team1.name,
                teamB: team2.name,
                tournamentId: tournament.id,
                tournamentRound: roundName,
                matchNumber: i + 1,
                competitionType: 'tournament',
                venue: tournament.venue || 'SMCC Ground',
                date: matchDate,
                status: 'upcoming'
            });
        }

        res.json({ success: true, message: `${roundName} bracket generated with ${halfLen} matches` });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
