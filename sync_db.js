const { sequelize } = require('./config/db');
const Match = require('./models/Match');
const Series = require('./models/Series');
const Tournament = require('./models/Tournament');
const User = require('./models/User');

async function syncDB() {
    try {
        console.log('🔄 Starting full database sync (alter: true)...');
        await sequelize.sync({ alter: true });
        console.log('✅ Database synchronized successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Database sync failed:', err);
        process.exit(1);
    }
}

syncDB();
