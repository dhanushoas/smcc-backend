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
        const socialCount = await SocialLink.count().catch(() => 0);

        if (linkCount === 0) {
            await FooterLink.bulkCreate([
                { title: 'Live Matches', route: '/', category: 'quick_links', order: 1 },
                { title: 'Upcoming Schedule', route: '/schedule', category: 'quick_links', order: 2 },
                { title: 'Points Table', route: '/points-table', category: 'quick_links', order: 3 },
                { title: 'Achievements', route: '/achievements', category: 'quick_links', order: 4 },

                { title: 'Contact Us', route: '/contact', category: 'support', order: 1 },
                { title: 'Share Feedback', route: '/feedback', category: 'support', order: 2 },
                { title: 'Report Issues', route: '/report', category: 'support', order: 3 },
                { title: 'Privacy Policy', route: '/privacy', category: 'support', order: 4 },

                { title: 'Improvements', route: '/improvements', category: 'community', order: 1 },
                { title: 'Join Council', route: '/join', category: 'community', order: 2 },
                { title: 'Sponsorship', route: '/sponsorship', category: 'community', order: 3 },
                { title: 'Console', route: '/login', category: 'community', order: 4 }
            ]);
        }

        if (socialCount === 0) {
            await SocialLink.bulkCreate([
                { platform: 'facebook', url: 'https://facebook.com/smcc', order: 1 },
                { platform: 'instagram', url: 'https://instagram.com/smcc', order: 2 },
                { platform: 'twitter-x', url: 'https://twitter.com/smcc', order: 3 },
                { platform: 'whatsapp', url: 'https://wa.me/smcc', order: 4 }
            ]);
        }
    } catch (err) {
    }
}

// @route   POST /api/footer/seed
// @desc    Force re-seed footer data
router.post('/seed', async (req, res) => {
    try {
        await FooterLink.destroy({ where: {}, truncate: true });
        await SocialLink.destroy({ where: {}, truncate: true });

        await FooterLink.bulkCreate([
            { title: 'Live Matches', route: '/', category: 'quick_links', order: 1 },
            { title: 'Upcoming Schedule', route: '/schedule', category: 'quick_links', order: 2 },
            { title: 'Points Table', route: '/points-table', category: 'quick_links', order: 3 },
            { title: 'Achievements', route: '/achievements', category: 'quick_links', order: 4 },

            { title: 'Contact Us', route: '/contact', category: 'support', order: 1 },
            { title: 'Share Feedback', route: '/feedback', category: 'support', order: 2 },
            { title: 'Report Issues', route: '/report', category: 'support', order: 3 },
            { title: 'Privacy Policy', route: '/privacy', category: 'support', order: 4 },

            { title: 'Improvements', route: '/improvements', category: 'community', order: 1 },
            { title: 'Join Council', route: '/join', category: 'community', order: 2 },
            { title: 'Sponsorship', route: '/sponsorship', category: 'community', order: 3 },
            { title: 'Console', route: '/login', category: 'community', order: 4 }
        ]);

        await SocialLink.bulkCreate([
            { platform: 'facebook', url: 'https://facebook.com/smcc', order: 1 },
            { platform: 'instagram', url: 'https://instagram.com/smcc', order: 2 },
            { platform: 'twitter-x', url: 'https://twitter.com/smcc', order: 3 },
            { platform: 'whatsapp', url: 'https://wa.me/smcc', order: 4 }
        ]);

        res.json({ success: true, message: 'Footer data seeded successfully' });
    } catch (err) {
        next(err); // Pass error to the next middleware (error handler)
    }
});

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

        // If categories are empty after fetch, return fallback structure
        if (grouped.quick_links.length === 0 && grouped.support.length === 0 && grouped.community.length === 0) {
            return res.json({
                success: true,
                message: 'No links found, returning fallbacks',
                data: {
                    quick_links: [{ title: 'Live Matches', route: '/' }],
                    support: [{ title: 'Contact Us', route: '/contact' }],
                    community: [{ title: 'Console', route: '/login' }]
                }
            });
        }

        res.json({
            success: true,
            message: 'Footer links fetched successfully',
            data: grouped
        });
    } catch (err) {
        // Fallback to empty structure instead of crashing
        res.status(200).json({
            success: true,
            message: 'Fallback empty footer links',
            data: {
                quick_links: [{ title: 'Live Matches', route: '/' }],
                support: [{ title: 'Contact Us', route: '/contact' }],
                community: [{ title: 'Console', route: '/login' }]
            }
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
        res.status(200).json({
            success: true,
            message: 'Fallback empty social links',
            data: []
        });
    }
});

module.exports = router;
