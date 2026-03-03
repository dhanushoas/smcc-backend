const { sequelize } = require('./config/db');
const FooterLink = require('./models/FooterLink');
const SocialLink = require('./models/SocialLink');

require('dotenv').config();

async function seedFooterData() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ force: true }); // Reset explicitly for setup

        console.log('Seeding Database...');

        const quickLinks = [
            { title: 'Live Matches', route: '/', category: 'quick_links', order: 1 },
            { title: 'Upcoming Schedule', route: '/schedule', category: 'quick_links', order: 2 },
            { title: 'Points Table', route: '/points-table', category: 'quick_links', order: 3 },
            { title: 'Achievements', route: '/achievements', category: 'quick_links', order: 4 },
        ];

        const supportLinks = [
            { title: 'Contact Us', route: '/contact', category: 'support', order: 1 },
            { title: 'Share Feedback', route: '/feedback', category: 'support', order: 2 },
            { title: 'Report Issues', route: '/report', category: 'support', order: 3 },
            { title: 'Privacy Policy', route: '/privacy', category: 'support', order: 4 },
        ];

        const communityLinks = [
            { title: 'Improvements', route: '/improvements', category: 'community', order: 1 },
            { title: 'Join Council', route: '/join', category: 'community', order: 2 },
            { title: 'Sponsorship', route: '/sponsorship', category: 'community', order: 3 },
            { title: 'Console', route: '/login', category: 'community', order: 4, roleVisibility: 'ADMIN' },
        ];

        await FooterLink.bulkCreate([...quickLinks, ...supportLinks, ...communityLinks]);

        const socials = [
            { platform: 'facebook', url: 'https://facebook.com/smcc', order: 1 },
            { platform: 'instagram', url: 'https://instagram.com/smcc', order: 2 },
            { platform: 'twitter-x', url: 'https://x.com/smcc', order: 3 },
            { platform: 'whatsapp', url: 'https://whatsapp.com/smcc', order: 4 }
        ];

        await SocialLink.bulkCreate(socials);

        console.log('Successfully seeded completely dynamic FooterLinks and SocialLinks!');
        process.exit();
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seedFooterData();
