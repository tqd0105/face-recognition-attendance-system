const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Token verification error:', error.message);
            return res.status(401).json({ message: 'Access denied: invalid or expired token' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Access denied: token not found' });
    }
};

const authorizeRoles = (...roles) => {
    const allowed = roles.map((role) => String(role).toLowerCase());

    return (req, res, next) => {
        const role = String(req.user?.role || '').toLowerCase();
        if (!role || !allowed.includes(role)) {
            return res.status(403).json({ message: 'Access denied: insufficient permissions' });
        }
        next();
    };
};

module.exports = { protect, authorizeRoles };