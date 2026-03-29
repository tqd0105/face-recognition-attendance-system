const pool = require('../config/db');

// @desc    Lấy danh sách các buổi học của một Lớp học phần
// @route   GET /api/sessions/:course_id
// @access  Private
exports.getSessionsByCourse = async (req, res) => {
  const {course_id} = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM Session WHERE course_class_id = $1 ORDER BY session_date DESC, start_time DESC',
      [course_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({message: 'Lỗi server khi lấy danh sách buổi học'});
  }
};

// @desc    Tạo buổi học mới
// @route   POST /api/sessions
// @access  Private
exports.createSession = async (req, res) => {
    const {course_class_id, session_date, start_time, end_time} = req.body;

    try {
        const newSession = await pool.query(
            `INSERT INTO Session (course_class_id, session_date, start_time, end_time) 
            VALUES ($1, $2, $3, $4) RETURNING *`,
            [course_class_id, session_date, start_time, end_time]
        );

        res.status(201).json({
            message: 'Tạo buổi học thành công!',
            data: newSession.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        if (error.message.includes('check constraint') || error.message.includes('session_check')) {
            return res.status(400).json({message: 'Thời gian bắt đầu phải trước thời gian kết thúc!'});
        }
        res.status(500).json({message: 'Lỗi server khi tạo buổi học'});
    }
};