const pool = require('../config/db');

// @desc    Lấy danh sách Lớp học phần CỦA GIẢNG VIÊN ĐANG ĐĂNG NHẬP
// @route   GET /api/courses-classes
// @access  Private
exports.getCourseClasses = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                cc.*,
                hc_direct.class_code AS home_class_code,
                COALESCE(ec.enrolled_count, 0) AS enrolled_count,
                COALESCE(hc.home_class_breakdown, '[]'::json) AS home_class_breakdown
             FROM Course_classes cc
             LEFT JOIN Home_class hc_direct ON hc_direct.id = cc.home_class_id
             LEFT JOIN (
                SELECT
                    e.course_class_id,
                    COUNT(DISTINCT e.student_id)::int AS enrolled_count
                FROM Enrollments e
                GROUP BY e.course_class_id
             ) ec ON ec.course_class_id = cc.id
             LEFT JOIN (
                SELECT
                    x.course_class_id,
                    json_agg(
                        json_build_object(
                            'class_code', COALESCE(hc.class_code, 'N/A'),
                            'count', x.student_count
                        )
                        ORDER BY COALESCE(hc.class_code, 'N/A')
                    ) AS home_class_breakdown
                FROM (
                    SELECT
                        e.course_class_id,
                        s.home_class_id,
                        COUNT(*)::int AS student_count
                    FROM Enrollments e
                    JOIN Student s ON s.id = e.student_id
                    GROUP BY e.course_class_id, s.home_class_id
                ) x
                LEFT JOIN Home_class hc ON hc.id = x.home_class_id
                GROUP BY x.course_class_id
             ) hc ON hc.course_class_id = cc.id
             WHERE cc.teacher_id = $1
             ORDER BY cc.created_at DESC`,
            [req.user.id]
        );
        res.status(200).json({
            message: 'Fetched course classes successfully',
            data: result.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while fetching course classes' });
    }
};

// @desc    Xem chi tiết 1 lớp học phần
// @route   GET /api/course-classes/:id
// @access  Private
exports.getCourseClassById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT cc.*, hc.class_code AS home_class_code
             FROM Course_classes cc
             LEFT JOIN Home_class hc ON hc.id = cc.home_class_id
             WHERE cc.id = $1 AND cc.teacher_id = $2`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Course class not found or access denied!' });
        }

        res.status(200).json({
            message: 'Fetched course class detail successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while fetching course class detail' });
    }
};

// @desc    Tạo Lớp học phần mới
// @route   POST /api/courses-classes
// @access  Private
exports.createCourseClass = async (req, res) => {
    try {
        const { course_code, course_name, semester, home_class_id } = req.body;

        const checkExist = await pool.query(
            'SELECT * FROM Course_classes WHERE course_code = $1',
            [course_code]
        );
        if (checkExist.rows.length > 0) {
            return res.status(400).json({ message: 'This course class code already exists in the system!' });
        }

        if (home_class_id) {
            const classCheck = await pool.query('SELECT id FROM Home_class WHERE id = $1', [home_class_id]);
            if (classCheck.rows.length === 0) {
                return res.status(400).json({ message: 'Selected home class does not exist!' });
            }
        }

        const newCourse = await pool.query(
            `INSERT INTO Course_classes (course_code, course_name, semester, home_class_id, teacher_id) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [course_code, course_name, semester, home_class_id ?? null, req.user.id]
        )

        res.status(201).json({
            message: 'Course class created successfully!',
            data: newCourse.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while creating course class' });
    }
};

// @desc    Cập nhật lớp học phần
// @route   PUT /api/course-classes/:id
// @access  Private
exports.updateCourseClass = async (req, res) => {
    const { id } = req.params;
    const { course_code, course_name, semester, home_class_id } = req.body;

    try {
        const ownership = await pool.query(
            'SELECT id FROM Course_classes WHERE id = $1 AND teacher_id = $2',
            [id, req.user.id]
        );
        if (ownership.rows.length === 0) {
            return res.status(404).json({ message: 'Course class not found or no update permission!' });
        }

        const duplicatedCode = await pool.query(
            'SELECT id FROM Course_classes WHERE course_code = $1 AND id != $2',
            [course_code, id]
        );
        if (duplicatedCode.rows.length > 0) {
            return res.status(400).json({ message: 'This course class code already exists in the system!' });
        }

        if (home_class_id) {
            const classCheck = await pool.query('SELECT id FROM Home_class WHERE id = $1', [home_class_id]);
            if (classCheck.rows.length === 0) {
                return res.status(400).json({ message: 'Selected home class does not exist!' });
            }
        }

        const updated = await pool.query(
            `UPDATE Course_classes
             SET course_code = $1, course_name = $2, semester = $3, home_class_id = $4
             WHERE id = $5 AND teacher_id = $6
             RETURNING *`,
            [course_code, course_name, semester, home_class_id ?? null, id, req.user.id]
        );

        return res.status(200).json({
            message: 'Course class updated successfully!',
            data: updated.rows[0],
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error while updating course class' });
    }
};

// @desc    Thêm danh sách sinh viên vào một lớp học phần
// @route   POST /api/course-classes/:id/enroll
// @access  Private
exports.enrollStudents = async (req, res) => {
    const { id } = req.params;
    const { student_ids } = req.body;

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ message: 'student_ids is invalid or empty!' });
    }

    try {
        const checkClass = await pool.query(
            'SELECT * FROM Course_classes WHERE id = $1 AND teacher_id = $2',
            [id, req.user.id]
        );
        if (checkClass.rows.length === 0) {
            return res.status(403).json({ message: 'Course class does not exist or permission denied!' });
        }
        const promises = student_ids.map(student_id => {
            return pool.query(
                `INSERT INTO Enrollments (student_id, course_class_id) 
                 VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [student_id, id]
            );
        });
        await Promise.all(promises);
        res.status(200).json({
            message: `Students enrolled successfully to course class ID: ${id}`
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while enrolling students' });
    }
};

// @desc    Lấy danh sách sinh viên đang học trong một lớp học phần cụ thể
// @route   GET /api/course-classes/:id/students
// @access  Private
exports.getEnrolledStudents = async (req, res) => {
    const { id } = req.params;
    try {
        const checkClass = await pool.query(
            'SELECT * FROM Course_classes WHERE id = $1 AND teacher_id = $2',
            [id, req.user.id]
        );
        if (checkClass.rows.length === 0) {
            return res.status(403).json({ message: 'Course class does not exist or access denied!' });
        }
        const result = await pool.query(
            `SELECT s.id, s.student_code, s.name, s.email, s.status, e.course_class_id 
             FROM Student s
             JOIN Enrollments e ON s.id = e.student_id
             WHERE e.course_class_id = $1
             ORDER BY s.student_code ASC`,
            [id]
        );

        res.status(200).json({
            message: 'Fetched enrolled students successfully',
            data: result.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while fetching enrolled students' });
    }
};

// @desc    Xóa lớp học phần
// @route   DELETE /api/course-classes/:id
// @access  Private
exports.deleteCourseClass = async (req, res) => {
    const { id } = req.params;

    try {
        const deleted = await pool.query(
            `DELETE FROM Course_classes
             WHERE id = $1 AND teacher_id = $2
             RETURNING *`,
            [id, req.user.id]
        );

        if (deleted.rows.length === 0) {
            return res.status(404).json({ message: 'Course class not found for delete or permission denied!' });
        }

        return res.status(200).json({
            message: 'Course class deleted successfully!',
            data: deleted.rows[0],
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error while deleting course class' });
    }
};