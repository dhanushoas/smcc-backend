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
        const linkCount = await FooterLink.count();
        const socialCount = await SocialLink.count();

        if (linkCount === 0) {
            console.log('SEEDING: FooterLink table empty, adding defaults...');
            await FooterLink.bulkCreate([
                { title: 'Live Matches', route: '/', category: 'quick_links', order: 1 },
                { title: 'Support', route: '/contact', category: 'support', order: 1 },
                { title: 'Community', route: '/join', category: 'community', order: 1 }
            ]);
        }

        if (socialCount === 0) {
            console.log('SEEDING: SocialLink table empty, adding defaults...');
            await SocialLink.bulkCreate([
                { platform: 'facebook', url: 'https://facebook.com', order: 1 },
                { platform: 'instagram', url: 'https://instagram.com', order: 2 }
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
        await ensureDefaultData();

        const links = await FooterLink.findAll({
            where: { isActive: true },
            order: [['category', 'ASC'], ['order', 'ASC']]
        });

        // Group by category for easier frontend parsing - ensure defaults are empty arrays NOT null
        const grouped = {
            quick_links: links.filter(l => l.category === 'quick_links') || [],
            support: links.filter(l => l.category === 'support') || [],
            community: links.filter(l => l.category === 'community') || [],
        };

        res.json({
            success: true,
            message: 'Footer links fetched successfully',
            data: grouped
        });
    } catch (err) {
        console.error('Error fetching footer links:', err);
        res.status(500).json({
            success: false,
            message: 'Server error fetching links',
            data: {
                quick_links: [],
                support: [],
                community: []
            }
        });
    }
});

// @route   GET /api/footer/socials
// @desc    Get all active social links
router.get('/socials', async (req, res) => {
    try {
        await ensureDefaultData();

        const socials = await SocialLink.findAll({
            where: { isActive: true },
            order: [['order', 'ASC']]
        });

        res.json({
            success: true,
            message: 'Social links fetched successfully',
            data: socials || [] // Ensure it's at least an empty array
        });
    } catch (err) {
        console.error('Error fetching social links:', err);
        res.status(500).json({
            success: false,
            message: 'Server error fetching social links',
            data: []
        });
    }
});

module.exports = router;
