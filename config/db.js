const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('CRITICAL ERROR: DATABASE_URL is not defined in environment variables!');
    console.error('Please add DATABASE_URL in Render -> Dashboard -> Environment.');
}

const sequelize = new Sequelize(dbUrl || 'mysql://localhost/test', {
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
        ssl: {
            rejectUnauthorized: false
        }
    }
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL Connected...');
    } catch (err) {
        console.error('CRITICAL: Unable to connect to the database:', err.message);
        console.error('The server will continue to run to maintain port binding, but API calls requiring DB will fail.');
        // We do legacy logic: keep process alive so Render doesn't loop-crash
    }
};

module.exports = { sequelize, connectDB };
