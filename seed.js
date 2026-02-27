const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { connectDB, sequelize } = require('./config/db');
require('dotenv').config();

const seed = async () => {
    try {
        await connectDB();
        await sequelize.sync({ force: true });

        console.log('Database Synced');

        // Check if admin exists
        const exists = await User.findOne({ where: { username: 'admin' } });
        if (exists) {
            console.log('Admin already exists');
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Admin@321', salt);

            await User.create({
                username: 'Admin',
                password: hashedPassword,
                role: 'admin'
            });

            console.log('Admin created (username: admin, password: adminpassword123)');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seed();
