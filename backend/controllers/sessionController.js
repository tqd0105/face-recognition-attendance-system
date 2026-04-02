const pool = require('../config/db');
const axios = require('axios');

// @desc    Lấy danh sách các buổi học (Lọc theo course_class_id)
// @route   GET /api/sessions
// @access  Private
exports.getSessions = async (req, res) => {
	const { course_class_id } = req.query;

    try {
        let query = 'SELECT * FROM Session';
        let values = [];

        if (course_class_id) {
            query += ' WHERE course_class_id = $1';
            values.push(course_class_id);
        }

        query += ' ORDER BY session_date DESC, start_time DESC';

        const result = await pool.query(query, values);
        
        res.status(200).json({
            message: 'Lấy danh sách buổi học thành công',
            data: result.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách buổi học' });
    }
};

// @desc    Tạo buổi học mới (Lên lịch)
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

// @desc    Bắt đầu buổi học & Nạp Vector khuôn mặt vào RAM cho AI
// @route   PATCH /api/sessions/:id/start
// @access  Private
exports.startSession = async (req, res) => {
	const {id} = req.params;
	try {
		const sessionCheck = await pool.query('SELECT * FROM Session WHERE id = $1', [id]);
		if (sessionCheck.rows.length === 0) {
			return res.status(404).json({ message: 'Không tìm thấy buổi học!' });
		}

		const courseClassId = sessionCheck.rows[0].course_class_id;

		const vectorQuery = `
			SELECT s.id AS student_id, f.embedding 
            FROM Enrollments e
            JOIN Student s ON e.student_id = s.id
            JOIN Face_embeddings f ON s.id = f.student_id
            WHERE e.course_class_id = $1
		`;
		const vectorResult = await pool.query(vectorQuery, [courseClassId]);

		if (vectorResult.rows.length === 0) {
			return res.status(400).json({ message: 'Lớp học này chưa có sinh viên nào đăng ký khuôn mặt!' });
		}

		const aiPayload = vectorResult.rows.map(row => ({
			student_id: row.student_id,
			vector: JSON.parse(row.embedding)
		}));

		const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
		try {
			await axios.post(`${aiServiceUrl}/ai/load-embeddings`, {
                session_id: id,
                embeddings: aiPayload
            });
		} catch (aiError) {
			console.error("Lỗi AI Service:", aiError.message);
            return res.status(503).json({ message: 'Không thể kết nối với AI Service để nạp dữ liệu nhận diện!' });
		}

		const updatedSession = await pool.query(
			`UPDATE Session SET status = 'active' WHERE id = $1 RETURNING *`,
            [id]
		);

		res.status(200).json({
            message: 'Đã bắt đầu buổi học và nạp dữ liệu khuôn mặt lên AI thành công!',
            data: updatedSession.rows[0]
        });
	} catch (error) {
		console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi bắt đầu buổi học' });
	}
};

// @desc    Kết thúc buổi học & Giải phóng RAM cho AI
// @route   PATCH /api/sessions/:id/stop
// @access  Private
exports.stopSession = async (req, res) => {
	const {id} = req.params;
	
	try {
		const updatedSession = await pool.query(
			`UPDATE Session SET status = 'completed' WHERE id = $1 RETURNING *`,
            [id]
		);
		if (updatedSession.rows.length === 0) {
			return res.status(404).json({ message: 'Không tìm thấy buổi học!' });
		}

		const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
		try {
			await axios.post(`${aiServiceUrl}/ai/unload`, { session_id: id });
		} catch (aiError) {
			console.error("Lỗi AI Service (Giải phóng RAM):", aiError.message);
		}

		res.status(200).json({
            message: 'Đã kết thúc buổi học!',
            data: updatedSession.rows[0]
        });
	} catch (error) {
		console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi kết thúc buổi học' });
	}
};