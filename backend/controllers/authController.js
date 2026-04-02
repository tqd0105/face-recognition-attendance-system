const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/jwtToken');

// @desc    Giảng viên đăng nhập
// @route   POST /api/auth/login
exports.loginTeacher = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM Teacher WHERE email = $1', [email]);
        const teacher = result.rows[0];

        if (!teacher) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, teacher.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.json({
            id: teacher.id,
            teacher_code: teacher.teacher_code,
            teacher_name: teacher.teacher_name,
            email: teacher.email,
            role: 'teacher',
            token: generateToken(teacher),
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Lấy thông tin giảng viên đang đăng nhập
// @route   GET /api/auth/me
// @access  Private (Cần có Token)
exports.getMe = async (req, res) => {
    try {
        res.json({
            message: 'Authenticated successfully!',
            user_info: req.user
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error!' });
    }
};