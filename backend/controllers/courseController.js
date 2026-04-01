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