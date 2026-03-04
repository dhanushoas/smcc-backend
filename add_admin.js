const { sequelize } = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

(async () => {
    try {
        await sequelize.authenticate();
        const passwordHash = await bcrypt.hash('admin123', 10);
        const [user, created] = await User.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                email: 'admin@smcc.org',
                password: passwordHash,
                role: 'admin',
                isLoggedIn: false,
                activePlatform: null,
                activeToken: null
            }
        });
        if (created) console.log('Admin user created');
        else console.log('Admin user already exists');
    } catch (err) {
        console.error('Error creating admin:', err);
    } finally {
        await sequelize.close();
    }
})();
