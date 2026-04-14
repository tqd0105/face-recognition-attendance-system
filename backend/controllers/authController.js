const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/jwtToken');

function parseAdminEmails() {
    return String(process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
}

function resolveRequestedRole(rawRole) {
    const normalized = String(rawRole || 'teacher').trim().toLowerCase();
    if (normalized === 'admin' || normalized === 'teacher' || normalized === 'student') {
        return normalized;
    }
    return 'teacher';
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

// @desc    Giảng viên đăng nhập
// @route   POST /api/auth/login
exports.loginTeacher = async (req, res) => {
    const { email, password } = req.body;
    const requestedRole = resolveRequestedRole(req.body?.role);

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !String(password || '').trim()) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    if (requestedRole === 'student') {
        try {
            const studentResult = await pool.query(
                `SELECT id, student_code, name, email, status, password_hash
                 FROM Student
                 WHERE LOWER(email) = $1`,
                [normalizedEmail]
            );

            const student = studentResult.rows[0];
            if (!student) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            if (String(student.status || '').toLowerCase() !== 'active') {
                return res.status(403).json({ message: 'Student account is inactive' });
            }

            if (!student.password_hash) {
                return res.status(503).json({
                    message: 'Student account password is not initialized. Please contact administrator.',
                });
            }

            const isMatch = await bcrypt.compare(String(password), student.password_hash);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            return res.json({
                id: student.id,
                student_code: student.student_code,
                student_name: student.name,
                email: student.email,
                role: 'student',
                token: generateToken({
                    id: student.id,
                    email: student.email,
                    role: 'student',
                    student_code: student.student_code,
                }),
            });
        } catch (error) {
            console.error(error.message);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    try {
        const result = await pool.query('SELECT * FROM Teacher WHERE LOWER(email) = $1', [normalizedEmail]);
        const teacher = result.rows[0];

        if (!teacher) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, teacher.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const adminEmails = parseAdminEmails();
        const normalizedTeacherEmail = String(teacher.email || '').toLowerCase();
        const hasAdminPrivilege =
            String(teacher.role || '').toLowerCase() === 'admin' ||
            String(teacher.status || '').toLowerCase() === 'admin' ||
            adminEmails.includes(normalizedTeacherEmail);

        if (requestedRole === 'teacher' && adminEmails.includes(normalizedTeacherEmail)) {
            return res.status(403).json({ message: 'Access denied: this account is admin-only. Please sign in with admin role.' });
        }

        if (requestedRole === 'admin' && !hasAdminPrivilege) {
            return res.status(403).json({ message: 'Access denied: this account is not admin' });
        }

        const effectiveRole = requestedRole === 'admin' ? 'admin' : 'teacher';

        res.json({
            id: teacher.id,
            teacher_code: teacher.teacher_code,
            teacher_name: teacher.teacher_name,
            email: teacher.email,
            role: effectiveRole,
            token: generateToken({
                id: teacher.id,
                email: teacher.email,
                role: effectiveRole,
                teacher_code: teacher.teacher_code,
            }),
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Sinh viên đổi mật khẩu cá nhân
// @route   PATCH /api/auth/student/change-password
// @access  Private (student)
exports.changeStudentPassword = async (req, res) => {
    const studentId = Number(req.user?.id);
    const { current_password, new_password } = req.body;

    if (!Number.isFinite(studentId) || studentId <= 0) {
        return res.status(401).json({ message: 'Invalid student session' });
    }

    if (!String(current_password || '').trim() || !String(new_password || '').trim()) {
        return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (String(new_password).length < 6) {
        return res.status(422).json({ message: 'New password must be at least 6 characters' });
    }

    try {
        const studentResult = await pool.query(
            'SELECT id, password_hash FROM Student WHERE id = $1',
            [studentId]
        );

        const student = studentResult.rows[0];
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (!student.password_hash) {
            return res.status(503).json({ message: 'Student password is not initialized' });
        }

        const matched = await bcrypt.compare(String(current_password), student.password_hash);
        if (!matched) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        const nextHash = await bcrypt.hash(String(new_password), salt);

        await pool.query(
            `UPDATE Student
             SET password_hash = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [nextHash, studentId]
        );

        return res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Lấy thông tin giảng viên đang đăng nhập
// @route   GET /api/auth/me
// @access  Private (Cần có Token)
exports.getMe = async (req, res) => {
    try {
        const userId = Number(req.user?.id);
        const role = String(req.user?.role || '').toLowerCase();

        if (!Number.isFinite(userId) || userId <= 0) {
            return res.status(401).json({ message: 'Invalid session' });
        }

        if (role === 'student') {
            const studentResult = await pool.query(
                `SELECT id, student_code, name, email, status
                 FROM Student
                 WHERE id = $1`,
                [userId]
            );

            const student = studentResult.rows[0];
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }

            return res.json({
                id: student.id,
                role: 'student',
                student_code: student.student_code,
                student_name: student.name,
                email: student.email,
                status: student.status,
            });
        }

        const teacherResult = await pool.query(
            `SELECT id, teacher_code, teacher_name, email, status
             FROM Teacher
             WHERE id = $1`,
            [userId]
        );

        const teacher = teacherResult.rows[0];
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        return res.json({
            id: teacher.id,
            role: role === 'admin' ? 'admin' : 'teacher',
            teacher_code: teacher.teacher_code,
            teacher_name: teacher.teacher_name,
            email: teacher.email,
            status: teacher.status,
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error!' });
    }
};