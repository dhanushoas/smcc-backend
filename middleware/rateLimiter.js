const rateLimit = require('express-rate-limit');

// 5 submissions per hour per IP for generic forms
const interactionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { msg: 'Too many submissions from this IP, please try again after an hour.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    interactionLimiter
};
