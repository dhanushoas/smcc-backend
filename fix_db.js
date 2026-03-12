const { sequelize } = require('./config/db');

async function fix() {
    try {
        const [results] = await sequelize.query(`SHOW INDEX FROM Users`);
        for (let row of results) {
            if (row.Key_name !== 'PRIMARY') {
                try {
                    await sequelize.query(`DROP INDEX \`${row.Key_name}\` ON Users`);
                } catch (e) { }
            }
        }

        const TournamentMatch = require('./models/TournamentMatch');
        await TournamentMatch.sync({ force: false, alter: false });

        console.log('Fixed DB Successfully!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fix();
