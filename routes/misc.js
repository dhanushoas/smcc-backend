const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Interaction = require('../models/Interaction');
const upload = require('../middleware/upload');
const { interactionLimiter } = require('../middleware/rateLimiter');
const { Op } = require('sequelize');

// Helper to handle validation errors
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            data: { errors: errors.array() }
        });
    }
    next();
};

// 1. Contact Us
router.post('/contact', interactionLimiter, [
    body('name').trim().isLength({ min: 3, max: 50 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().isNumeric().isLength({ min: 10, max: 15 }),
    body('subject').trim().notEmpty().escape(),
    body('message').trim().isLength({ min: 10, max: 500 }).escape()
], validateRequest, async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        const interaction = await Interaction.create({
            type: 'contact', name, email, phone, subject, message,
            ipAddress: req.ip || req.connection.remoteAddress
        });
        res.status(201).json({
            success: true,
            message: 'Contact submitted successfully',
            data: { id: interaction.id }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server error during contact submission',
            data: null
        });
    }
});

// 2. Share Feedback (Optional Image)
router.post('/feedback', interactionLimiter, upload.single('image'), [
    body('rating').isInt({ min: 1, max: 5 }),
    body('feedbackType').trim().notEmpty().escape(),
    body('message').trim().isLength({ min: 10 }).escape()
], validateRequest, async (req, res) => {
    try {
        const { rating, feedbackType, message, name, email } = req.body;

        let files = null;
        if (req.file) {
            files = [req.file.filename];
        }

        const interaction = await Interaction.create({
            type: 'feedback', name, email, message,
            data: { rating, feedbackType },
            files,
            ipAddress: req.ip || req.connection.remoteAddress
        });
        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: { id: interaction.id }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server error during feedback submission',
            data: null
        });
    }
});

// 3. Report Issues
router.post('/report', interactionLimiter, upload.single('screenshot'), [
    body('issueType').trim().notEmpty().escape(),
    body('pageUrl').optional().isURL(),
    body('severity').trim().notEmpty().escape(),
    body('description').trim().notEmpty().escape()
], validateRequest, async (req, res) => {
    try {
        const { issueType, pageUrl, severity, description, name, email } = req.body;

        let files = null;
        if (req.file) {
            files = [req.file.filename];
        }

        const interaction = await Interaction.create({
            type: 'report', name, email, message: description,
            data: { issueType, pageUrl, severity },
            files,
            ipAddress: req.ip || req.connection.remoteAddress
        });
        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            data: { id: interaction.id }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server error during report submission',
            data: null
        });
    }
});

// 4. Improvements (Duplicate Check)
router.post('/improvement', interactionLimiter, [
    body('title').trim().isLength({ min: 5 }).escape(),
    body('description').trim().isLength({ min: 20 }).escape(),
    body('category').trim().notEmpty().escape(),
    body('priority').trim().notEmpty().escape()
], validateRequest, async (req, res) => {
    try {
        const { title, description, category, priority, name, email } = req.body;

        // Prevent duplicate title submissions within short timeframe (last 7 days)
        const duplicate = await Interaction.findOne({
            where: {
                type: 'improvement',
                subject: title,
                createdAt: { [Op.gte]: new Date(new Date() - 7 * 24 * 60 * 60 * 1000) }
            }
        });

        if (duplicate) {
            return res.status(400).json({
                success: false,
                message: 'An improvement with this title was recently suggested.',
                data: null
            });
        }

        const interaction = await Interaction.create({
            type: 'improvement', name, email, subject: title, message: description,
            data: { category, priority },
            ipAddress: req.ip || req.connection.remoteAddress
        });
        res.status(201).json({
            success: true,
            message: 'Improvement submitted successfully',
            data: { id: interaction.id }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server error during improvement submission',
            data: null
        });
    }
});

// 5. Join Council (Mandatory ID Upload)
router.post('/join-council', interactionLimiter, upload.single('idDocument'), [
    body('name').trim().notEmpty().escape(),
    body('email').isEmail().normalizeEmail(),
    body('phone').notEmpty().isNumeric(),
    body('age').isInt({ min: 18 }),
    body('role').trim().notEmpty().escape(),
    body('experience').trim().notEmpty().escape()
], validateRequest, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'ID upload is mandatory for Join Council requests.',
                data: null
            });
        }

        const { name, email, phone, age, role, experience } = req.body;
        const interaction = await Interaction.create({
            type: 'join_council', name, email, phone, message: `Application for ${role}`,
            data: { age, role, experience, otpVerified: false }, // OTP mock flag
            files: [req.file.filename],
            ipAddress: req.ip || req.connection.remoteAddress
        });
        res.status(201).json({
            success: true,
            message: 'Council application submitted successfully',
            data: { id: interaction.id }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server error during council application submission',
            data: null
        });
    }
});

// 6. Sponsorship (Mandatory Proposal Upload)
router.post('/sponsorship', interactionLimiter, upload.single('proposal'), [
    body('company').trim().notEmpty().escape(),
    body('contactPerson').trim().notEmpty().escape(),
    body('email').isEmail().normalizeEmail(),
    body('phone').notEmpty().isNumeric(),
    body('budget').isNumeric()
], validateRequest, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Proposal upload is mandatory for Sponsorship requests.',
                data: null
            });
        }

        const { company, contactPerson, email, phone, budget } = req.body;
        const interaction = await Interaction.create({
            type: 'sponsorship', name: contactPerson, email, phone, message: `Sponsorship Inquiry from ${company}`,
            data: { company, budget, otpVerified: false }, // OTP mock flag
            files: [req.file.filename],
            ipAddress: req.ip || req.connection.remoteAddress
        });
        res.status(201).json({
            success: true,
            message: 'Sponsorship inquiry submitted successfully',
            data: { id: interaction.id }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server error during sponsorship inquiry submission',
            data: null
        });
    }
});

// Admin Get Route
router.get('/all', async (req, res) => {
    try {
        const interactions = await Interaction.findAll({ order: [['createdAt', 'DESC']] });
        res.json({
            success: true,
            message: 'All interactions fetched successfully',
            data: interactions
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error fetching interactions',
            data: null
        });
    }
});

module.exports = router;
