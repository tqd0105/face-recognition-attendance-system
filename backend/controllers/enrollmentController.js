const pool = require('../config/db');

// @desc    Thêm sinh viên vào Lớp học phần
// @route   POST /api/enrollments
// @access  Private
exports.enrollStudent = async (req, res) => {
    const { student_id, course_class_id } = req.body;

    try {
        const checkExist = await pool.query(
            'SELECT * FROM Enrollments WHERE student_id = $1 AND course_class_id = $2',
            [student_id, course_class_id]
        );

        if (checkExist.rows.length > 0) {
            return res.status(400).json({ message: 'This student is already enrolled in the class!' });
        }

        await pool.query(
            'INSERT INTO Enrollments (student_id, course_class_id) VALUES ($1, $2)',
            [student_id, course_class_id]
        );
        res.status(201).json({ message: 'Student enrolled to course class successfully!' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while enrolling student' });
    }
};

// @desc    Lấy danh sách sinh viên thuộc một Lớp học phần cụ thể
// @route   GET /api/enrollments/:course_id
// @access  Private
exports.getEnrolledStudents = async (req, res) => {
    const { course_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT s.id, s.student_code, s.name, s.email, s.status
            FROM Student s
            JOIN Enrollments e ON s.id = e.student_id
            WHERE e.course_class_id = $1
            ORDER BY s.student_code ASC`,
            [course_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while fetching enrolled students' });
    }
};