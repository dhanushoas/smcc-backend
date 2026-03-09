const { connectDB, sequelize } = require('./config/db');
const Series = require('./models/Series');
const Match = require('./models/Match');

async function test() {
    try {
        await connectDB();
        await sequelize.sync({ alter: true });

        const seriesData = {
            name: "Local Test",
            teamA: "A",
            teamB: "B",
            type: "best_of_3",
            oversPerMatch: 20,
            startDate: "2026-03-09T09:30:00.000Z",
            venue: "Test"
        };

        console.log("Creating series...");
        const series = await Series.create(seriesData);
        console.log("Series created:", series.id);

        const SERIES_MATCH_COUNT = {
            best_of_3: 3,
            best_of_5: 5,
            best_of_7: 7,
        };
        const totalMatches = SERIES_MATCH_COUNT[series.type] || 3;
        const startDate = series.startDate ? new Date(series.startDate) : new Date();

        for (let i = 1; i <= totalMatches; i++) {
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
            console.log("Created Match", i);
        }

        console.log("Done");
        process.exit(0);
    } catch (err) {
        console.error("ERROR CAUGHT:");
        console.error(err);
        process.exit(1);
    }
}
test();
