const jwt = require('jsonwebtoken');
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            role: 'teacher',
            email: user.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '30d',
        }
    );
};

module.exports = generateToken;