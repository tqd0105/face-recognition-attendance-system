const pool = require('../config/db');

// @desc    Lấy danh sách sinh viên (hỗ trợ lọc theo lớp)
// @route   GET /api/students
// @access  Private
exports.getStudents = async (req, res) => {
    const { class_id } = req.query;

    try {
        let query = `
            SELECT s.*, c.class_code 
            FROM Student s
            LEFT JOIN Home_class c ON s.home_class_id = c.id
        `;
        let values = [];

        if (class_id) {
            query += ` WHERE s.home_class_id = $1 `;
            values.push(class_id);
            query += ` ORDER BY s.created_at DESC `;
        } else {
            query += ` ORDER BY s.created_at DESC`;
        }

        const result = await pool.query(query, values);

        res.status(200).json({
            message: 'Fetched students successfully',
            data: result.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while fetching students' });
    }
};

// @desc    Thêm sinh viên mới
// @route   POST /api/students
// @access  Private
exports.createStudent = async (req, res) => {
    const { student_code, name, email, home_class_id } = req.body;

    try {
        const checkExist = await pool.query(
            'SELECT * FROM Student WHERE student_code = $1 OR email = $2',
            [student_code, email]
        );
        if (checkExist.rows.length > 0) {
            return res.status(400).json({ message: 'Student code or email already exists in the system!' });
        }

        const newStudent = await pool.query(
            `INSERT INTO Student (student_code, name, email, home_class_id) 
            VALUES ($1, $2, $3, $4) RETURNING *`,
            [student_code, name, email, home_class_id]
        );

        res.status(201).json({
            message: 'Student created successfully!',
            data: newStudent.rows[0]
        })
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while creating student' });
    }
};

// @desc    Cập nhật thông tin sinh viên
// @route   PUT /api/students/:id
// @access  Private
exports.updateStudent = async (req, res) => {
    const { id } = req.params;
    const { student_code, name, email, home_class_id, status } = req.body;

    try {
        const checkExist = await pool.query(
            'SELECT * FROM Student WHERE (student_code = $1 OR email = $2) AND id != $3',
            [student_code, email, id]
        );

        if (checkExist.rows.length > 0) {
            return res.status(400).json({ message: 'Student code or email is already used by another student!' });
        }

        const updatedStudent = await pool.query(
            `UPDATE Student 
             SET student_code = $1, name = $2, email = $3, home_class_id = $4, status = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 RETURNING *`,
            [student_code, name, email, home_class_id, status || 'active', id]
        );

        if (updatedStudent.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found for update!' });
        }

        res.status(200).json({
            message: 'Student updated successfully!',
            data: updatedStudent.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while updating student' });
    }
};

// @desc    Xóa sinh viên (Soft delete - Đổi status thành 'inactive')
// @route   DELETE /api/students/:id
// @access  Private
exports.deleteStudent = async (req, res) => {
    const { id } = req.params;

    try {
        // Soft delete: Không dùng lệnh DELETE FROM, chỉ UPDATE status
        const deletedStudent = await pool.query(
            `UPDATE Student 
             SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING *`,
            [id]
        );

        if (deletedStudent.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found for delete!' });
        }

        res.status(200).json({
            message: 'Student deactivated successfully (soft delete)!',
            data: deletedStudent.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while deleting student' });
    }
};

// @desc    Khôi phục sinh viên đã soft delete (status = active)
// @route   PATCH /api/students/:id/restore
// @access  Private
exports.restoreStudent = async (req, res) => {
    const { id } = req.params;

    try {
        const restoredStudent = await pool.query(
            `UPDATE Student
             SET status = 'active', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING *`,
            [id]
        );

        if (restoredStudent.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found for restore!' });
        }

        res.status(200).json({
            message: 'Student restored successfully!',
            data: restoredStudent.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while restoring student' });
    }
};

// @desc    Xóa vĩnh viễn sinh viên (Hard delete)
// @route   DELETE /api/students/:id/permanent
// @access  Private
exports.hardDeleteStudent = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedStudent = await pool.query(
            `DELETE FROM Student
             WHERE id = $1
             RETURNING id, student_code, name`,
            [id]
        );

        if (deletedStudent.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found for permanent delete!' });
        }

        return res.status(200).json({
            message: 'Student permanently deleted successfully!',
            data: deletedStudent.rows[0],
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error while permanently deleting student' });
    }
};