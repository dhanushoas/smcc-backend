const User = require('./models/User');
const { sequelize } = require('./config/db');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Sync the model to add missing columns
        await sequelize.sync({ alter: true });
        console.log('Database synced (alter: true).');

        const users = await User.findAll();
        console.log(`Found ${users.length} users.`);
        if (users.length > 0) {
            console.log('User sample:', JSON.stringify(users[0], null, 2));
        }
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        process.exit();
    }
}

check();
