const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    let token = req.header('x-auth-token');

    // Check for Authorization header (Bearer token)
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token, authorization denied',
            data: null
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smccsecrettoken123_fallback');
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({
            success: false,
            message: 'Token is not valid',
            data: null
        });
    }
};

module.exports = auth;
