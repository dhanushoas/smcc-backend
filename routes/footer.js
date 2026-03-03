const express = require('express');
const router = express.Router();
const FooterLink = require('../models/FooterLink');
const SocialLink = require('../models/SocialLink');

/**
 * Internal helper to ensure some footer data exists.
 * Useful for new environments (like Render PR previews).
 */
async function ensureDefaultData() {
    try {
        // Explicitly check for table existence if possible, or just catch errors
        const linkCount = await FooterLink.count();
        const socialCount = await SocialLink.socialCount?.() || await SocialLink.count(); // Safety check

        if (linkCount === 0) {
            console.log('SEEDING: FooterLink table empty, adding defaults...');
            await FooterLink.bulkCreate([
                { title: 'Home', route: '/', category: 'quick_links', order: 1 },
                { title: 'Points Table', route: '/points-table', category: 'quick_links', order: 2 },
                { title: 'Schedule', route: '/schedule', category: 'quick_links', order: 3 },
                { title: 'Squads', route: '/squads', category: 'quick_links', order: 4 },

                { title: 'Contact Us', route: '/contact', category: 'support', order: 1 },
                { title: 'Privacy Policy', route: '/privacy', category: 'support', order: 2 },
                { title: 'Terms of Use', route: '/terms', category: 'support', order: 3 },

                { title: 'About SMCC', route: '/about', category: 'community', order: 1 },
                { title: 'Join Council', route: '/join-council', category: 'community', order: 2 },
                { title: 'Sponsorship', route: '/sponsorship', category: 'community', order: 3 }
            ]);
        }

        if (socialCount === 0) {
            console.log('SEEDING: SocialLink table empty, adding defaults...');
            await SocialLink.bulkCreate([
                { platform: 'facebook', url: 'https://facebook.com/smcc', order: 1 },
                { platform: 'instagram', url: 'https://instagram.com/smcc', order: 2 },
                { platform: 'twitter-x', url: 'https://twitter.com/smcc', order: 3 },
                { platform: 'whatsapp', url: 'https://wa.me/smcc', order: 4 }
            ]);
        }
    } catch (err) {
        console.error('Auto-seeding failure (non-blocking):', err.message);
    }
}

// @route   GET /api/footer/links
// @desc    Get all active footer links grouped by category
router.get('/links', async (req, res) => {
    try {
        // Try seeding if empty
        await ensureDefaultData();

        const links = await FooterLink.findAll({
            where: { isActive: true },
            order: [['order', 'ASC']]
        });

        // Group by category for easier frontend parsing
        const grouped = {
            quick_links: links.filter(l => l.category === 'quick_links'),
            support: links.filter(l => l.category === 'support'),
            community: links.filter(l => l.category === 'community'),
        };

        res.json({
            success: true,
            message: 'Footer links fetched successfully',
            data: grouped
        });
    } catch (err) {
        console.error('Error fetching footer links:', err);
        // Fallback to empty structure instead of crashing
        res.status(200).json({
            success: true,
            message: 'Fallback empty footer links',
            data: { quick_links: [], support: [], community: [] }
        });
    }
});

// @route   GET /api/footer/socials
// @desc    Get all active social links
router.get('/socials', async (req, res) => {
    try {
        // Try seeding if empty
        await ensureDefaultData();

        const socials = await SocialLink.findAll({
            where: { isActive: true },
            order: [['order', 'ASC']]
        });

        res.json({
            success: true,
            message: 'Social links fetched successfully',
            data: socials || []
        });
    } catch (err) {
        console.error('Error fetching social links:', err);
        res.status(200).json({
            success: true,
            message: 'Fallback empty social links',
            data: []
        });
    }
});

module.exports = router;
