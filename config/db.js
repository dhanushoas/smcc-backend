const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('CRITICAL ERROR: DATABASE_URL is not defined in environment variables!');
    console.error('Please add DATABASE_URL in Render -> Dashboard -> Environment.');
}

const sequelize = new Sequelize(dbUrl || 'mysql://localhost/test', {
    dialect: 'mysql',
    dialectOptions: {
        ssl: {
            rejectUnauthorized: false
        }
    }
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
    } catch (err) {
        console.error('-------------------------------------------');
        console.error('❌ CRITICAL: Unable to connect to database');
        console.error('ERROR MESSAGE:', err.message);
        console.error('The server will continue to run to maintain port binding, but API calls requiring DB will fail.');
        console.error('-------------------------------------------');
    }
};

module.exports = { sequelize, connectDB };
