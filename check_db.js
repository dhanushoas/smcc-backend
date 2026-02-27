const { sequelize } = require('./config/db');
const User = require('./models/User');
const Match = require('./models/Match');

const checkDB = async () => {
    try {
        console.log('Connecting to Aiven MySQL...');
        await sequelize.authenticate();
        console.log('✅ Connection established successfully.');

        // Check Users
        console.log('\n--- Users in Database ---');
        const users = await User.findAll();
        if (users.length === 0) {
            console.log('No users found.');
        } else {
            users.forEach(u => {
                console.log(`ID: ${u.id} | Username: ${u.username} | Role: ${u.role}`);
            });
        }

        // Check Matches
        console.log('\n--- Matches in Database ---');
        const matches = await Match.findAll();
        if (matches.length === 0) {
            console.log('No matches found.');
        } else {
            matches.forEach(m => {
                console.log(`ID: ${m.id} | ${m.teamA} vs ${m.teamB} | Status: ${m.status}`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error checking database:', err.message);
        process.exit(1);
    }
};

checkDB();
