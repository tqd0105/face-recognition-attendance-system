const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Private (admin)
exports.getTeachers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, teacher_code, teacher_name, email, role, status, created_at
            FROM Teacher
            ORDER BY created_at DESC
        `);
        return res.status(200).json({
            message: 'Teachers fetched successfully',
            data: result.rows,
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Create a new teacher
// @route   POST /api/teachers
// @access  Private (admin)
exports.createTeacher = async (req, res) => {
    const { teacher_code, teacher_name, email, password, role, status } = req.body;

    if (!teacher_code || !teacher_name || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const existingCode = await pool.query('SELECT id FROM Teacher WHERE teacher_code = $1', [teacher_code]);
        if (existingCode.rows.length > 0) {
            return res.status(409).json({ message: 'Teacher code already exists' });
        }

        const existingEmail = await pool.query('SELECT id FROM Teacher WHERE LOWER(email) = LOWER($1)', [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            `INSERT INTO Teacher (teacher_code, teacher_name, email, password_hash, role, status)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, teacher_code, teacher_name, email, role, status`,
            [teacher_code, teacher_name, email.toLowerCase(), hash, role || 'teacher', status || 'active']
        );

        return res.status(201).json({
            message: 'Teacher created successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Update a teacher
// @route   PUT /api/teachers/:id
// @access  Private (admin)
exports.updateTeacher = async (req, res) => {
    const { id } = req.params;
    const { teacher_name, email, role, status } = req.body;

    if (!teacher_name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
    }

    try {
        const existingEmail = await pool.query('SELECT id FROM Teacher WHERE LOWER(email) = LOWER($1) AND id != $2', [email, id]);
        if (existingEmail.rows.length > 0) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        const result = await pool.query(
            `UPDATE Teacher 
             SET teacher_name = $1, email = $2, role = $3, status = $4, updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 RETURNING id, teacher_code, teacher_name, email, role, status`,
            [teacher_name, email.toLowerCase(), role || 'teacher', status || 'active', id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        return res.status(200).json({
            message: 'Teacher updated successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Delete a teacher
// @route   DELETE /api/teachers/:id
// @access  Private (admin)
exports.deleteTeacher = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM Teacher WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        return res.status(200).json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        // If it fails due to foreign key constraints, we can instruct the user or we can soft delete.
        // Usually, we should soft delete.
        if (error.code === '23503') { // foreign_key_violation
            return res.status(400).json({ 
                message: 'Cannot delete teacher because they are assigned to classes or sessions. Please disable them instead.' 
            });
        }
        console.error(error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
