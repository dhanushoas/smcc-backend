const express = require('express');
const router = express.Router();
const FooterLink = require('../models/FooterLink');
const SocialLink = require('../models/SocialLink');

// @route   GET /api/footer/links
// @desc    Get all active footer links grouped by category
router.get('/links', async (req, res) => {
    try {
        const links = await FooterLink.findAll({
            where: { isActive: true },
            order: [['category', 'ASC'], ['order', 'ASC']]
        });

        // Group by category for easier frontend parsing
        const grouped = {
            quick_links: links.filter(l => l.category === 'quick_links'),
            support: links.filter(l => l.category === 'support'),
            community: links.filter(l => l.category === 'community'),
        };

        res.json(grouped);
    } catch (err) {
        console.error('Error fetching footer links:', err);
        res.status(500).json({ msg: 'Server error fetching links' });
    }
});

// @route   GET /api/footer/socials
// @desc    Get all active social links
router.get('/socials', async (req, res) => {
    try {
        const socials = await SocialLink.findAll({
            where: { isActive: true },
            order: [['order', 'ASC']]
        });
        res.json(socials);
    } catch (err) {
        console.error('Error fetching social links:', err);
        res.status(500).json({ msg: 'Server error fetching social links' });
    }
});

module.exports = router;
