const { sequelize } = require('./config/db');
const FooterLink = require('./models/FooterLink');

async function cleanupManuals() {
    try {
        const deletedCount = await FooterLink.destroy({
            where: {
                title: ['User Manual (PDF)', 'Admin Manual (PDF)']
            }
        });
        console.log(`Successfully removed ${deletedCount} manual records from footer_links.`);
        process.exit(0);
    } catch (err) {
        console.error('Error cleaning up manuals:', err);
        process.exit(1);
    }
}

cleanupManuals();
