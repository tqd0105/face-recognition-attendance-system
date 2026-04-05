const jwt = require('jsonwebtoken');
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            role: user.role || 'teacher',
            email: user.email,
            teacher_code: user.teacher_code,
            student_code: user.student_code,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '30d',
        }
    );
};

module.exports = generateToken;