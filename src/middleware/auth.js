const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Support both Authorization header and ?token= query param (for file downloads)
        let token = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'secret-placeholder');
        req.user = decodedToken;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Authentication expired.' });
        }
        return res.status(401).json({ message: 'Invalid authentication.' });
    }
};

module.exports = authMiddleware;
