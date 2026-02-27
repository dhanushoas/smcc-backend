const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { connectDB } = require('./config/db');
require('dotenv').config();

const updateAdmin = async () => {
    try {
        await connectDB();
        console.log('Database Connected');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin@321', salt);
        const targetUsername = 'Admin';

        // Try to find existing 'admin' or 'Admin'
        // We will try finding 'admin' first to rename/update it, otherwise 'Admin'
        let user = await User.findOne({ where: { username: 'admin' } });

        if (user) {
            console.log('Found user "admin", updating to "Admin" and setting new password...');
            user.username = targetUsername;
            user.password = hashedPassword;
            user.role = 'admin'; // Ensure role is admin
            await user.save();
            console.log('Success: Updated "admin" to "Admin" with new password.');
        } else {
            user = await User.findOne({ where: { username: targetUsername } });
            if (user) {
                console.log('Found user "Admin", updating password...');
                user.password = hashedPassword;
                user.role = 'admin';
                await user.save();
                console.log('Success: Updated "Admin" password.');
            } else {
                console.log('Admin user not found, creating new "Admin"...');
                await User.create({
                    username: targetUsername,
                    password: hashedPassword,
                    role: 'admin'
                });
                console.log('Success: Created "Admin" user.');
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Error updating admin:', err);
        process.exit(1);
    }
};

updateAdmin();
