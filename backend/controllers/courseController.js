const pool = require('../config/db');

// @desc    Lấy danh sách Lớp học phần CỦA GIẢNG VIÊN ĐANG ĐĂNG NHẬP
// @route   GET /api/courses-classes
// @access  Private
exports.getCourseClasses = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM Course_classes WHERE teacher_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.status(200).json({
            message: 'Lấy danh sách Lớp học phần thành công',
            data: result.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách Lớp học phần' });
    }
};

// @desc    Xem chi tiết 1 lớp học phần
// @route   GET /api/course-classes/:id
// @access  Private
exports.getCourseClassById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM Course_classes WHERE id = $1 AND teacher_id = $2',
            [id, req.user.id] 
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học phần hoặc bạn không có quyền truy cập!' });
        }

        res.status(200).json({
            message: 'Lấy chi tiết Lớp học phần thành công',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi xem chi tiết Lớp học phần' });
    }
};

// @desc    Tạo Lớp học phần mới
// @route   POST /api/courses-classes
// @access  Private
exports.createCourseClass = async (req, res) => {
    try {
        const {course_code, course_name, semester} = req.body;

        const checkExist = await pool.query(
            'SELECT * FROM Course_classes WHERE course_code = $1',
            [course_code]
        );
        if (checkExist.rows.length > 0) {
            return res.status(400).json({ message: 'Mã lớp học phần này đã tồn tại trong hệ thống!' });
        }
        
        const newCourse =  await pool.query(
            `INSERT INTO Course_classes (course_code, course_name, semester, teacher_id) 
            VALUES ($1, $2, $3, $4) RETURNING *`,
            [course_code, course_name, semester, req.user.id]
        )

        res.status(201).json({
            message: 'Tạo Lớp học phần thành công!',
            data: newCourse.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi tạo Lớp học phần' });
    }
};

// @desc    Thêm danh sách sinh viên vào một lớp học phần
// @route   POST /api/course-classes/:id/enroll
// @access  Private
exports.enrollStudents = async (req, res) => {
    const {id} = req.params;
    const {student_ids} = req.body;

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ message: 'Danh sách sinh viên (student_ids) không hợp lệ hoặc trống!' });
    }

    try {
        const checkClass = await pool.query(
            'SELECT * FROM Course_classes WHERE id = $1 AND teacher_id = $2',
            [id, req.user.id]
        );
        if (checkClass.rows.length === 0) {
            return res.status(403).json({ message: 'Lớp học phần không tồn tại hoặc bạn không có quyền thao tác!' });
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
            message: `Đã ghi danh thành công các sinh viên vào lớp học phần ID: ${id}`
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi ghi danh sinh viên' });
    }
};

// @desc    Lấy danh sách sinh viên đang học trong một lớp học phần cụ thể
// @route   GET /api/course-classes/:id/students
// @access  Private
exports.getEnrolledStudents = async (req, res) => {
    const {id} = req.params;
    try {
        const checkClass = await pool.query(
            'SELECT * FROM Course_classes WHERE id = $1 AND teacher_id = $2',
            [id, req.user.id]
        );
        if (checkClass.rows.length === 0) {
            return res.status(403).json({ message: 'Lớp học phần không tồn tại hoặc bạn không có quyền truy cập!' });
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
            message: 'Lấy danh sách sinh viên của lớp học phần thành công',
            data: result.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách sinh viên của lớp' });
    }
};