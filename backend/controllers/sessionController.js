const pool = require('../config/db');
const axios = require('axios');

function resolveAiConfig() {
	return {
		aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
		aiServiceToken: process.env.AI_SERVICE_TOKEN || process.env.API_TOKEN || 'change_me',
	};
}

function parseEmbedding(rawEmbedding) {
	if (Array.isArray(rawEmbedding)) {
		return rawEmbedding.map((value) => Number(value));
	}

	if (typeof rawEmbedding === 'string') {
		const normalized = rawEmbedding.trim().replace(/^\[/, '').replace(/\]$/, '');
		if (!normalized) {
			return [];
		}
		return normalized.split(',').map((value) => Number(value.trim()));
	}

	return [];
}

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
			message: 'Fetched sessions successfully',
			data: result.rows
		});
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ message: 'Server error while fetching sessions' });
	}
};

// @desc    Tạo buổi học mới (Lên lịch)
// @route   POST /api/sessions
// @access  Private
exports.createSession = async (req, res) => {
	const { course_class_id, session_date, start_time, end_time } = req.body;

	try {
		const newSession = await pool.query(
			`INSERT INTO Session (course_class_id, session_date, start_time, end_time) 
						VALUES ($1, $2, $3, $4) RETURNING *`,
			[course_class_id, session_date, start_time, end_time]
		);

		res.status(201).json({
			message: 'Session created successfully!',
			data: newSession.rows[0]
		});
	} catch (error) {
		console.error(error.message);
		if (error.message.includes('check constraint') || error.message.includes('session_check')) {
			return res.status(400).json({ message: 'Start time must be earlier than end time!' });
		}
		res.status(500).json({ message: 'Server error while creating session' });
	}
};

// @desc    Cập nhật buổi học
// @route   PUT /api/sessions/:id
// @access  Private
exports.updateSession = async (req, res) => {
	const { id } = req.params;
	const { course_class_id, session_date, start_time, end_time, status } = req.body;

	try {
		const existing = await pool.query('SELECT id FROM Session WHERE id = $1', [id]);
		if (existing.rows.length === 0) {
			return res.status(404).json({ message: 'Session not found for update!' });
		}

		const updated = await pool.query(
			`UPDATE Session
			 SET course_class_id = $1,
			     session_date = $2,
			     start_time = $3,
			     end_time = $4,
			     status = COALESCE($5, status)
			 WHERE id = $6
			 RETURNING *`,
			[course_class_id, session_date, start_time, end_time, status, id]
		);

		return res.status(200).json({
			message: 'Session updated successfully!',
			data: updated.rows[0],
		});
	} catch (error) {
		console.error(error.message);
		if (error.message.includes('check constraint') || error.message.includes('session_check')) {
			return res.status(400).json({ message: 'Start time must be earlier than end time!' });
		}
		return res.status(500).json({ message: 'Server error while updating session' });
	}
};

// @desc    Bắt đầu buổi học & Nạp Vector khuôn mặt vào RAM cho AI
// @route   PATCH /api/sessions/:id/start
// @access  Private
exports.startSession = async (req, res) => {
	const { id } = req.params;
	try {
		const sessionCheck = await pool.query('SELECT * FROM Session WHERE id = $1', [id]);
		if (sessionCheck.rows.length === 0) {
			return res.status(404).json({ message: 'Session not found!' });
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
			return res.status(400).json({ message: 'No students in this class have enrolled face data yet!' });
		}

		const aiPayload = vectorResult.rows.map(row => ({
			student_id: String(row.student_id),
			embedding: parseEmbedding(row.embedding)
		}));

		const { aiServiceUrl, aiServiceToken } = resolveAiConfig();
		try {
			await axios.post(`${aiServiceUrl}/ai/load-embeddings`, {
				session_id: String(id),
				items: aiPayload
			}, {
				headers: {
					'X-Service-Token': aiServiceToken,
				},
			});
		} catch (aiError) {
			console.error("AI Service error:", aiError?.response?.data || aiError.message);
			return res.status(503).json({ message: 'Unable to connect to AI Service to load recognition data!' });
		}

		const updatedSession = await pool.query(
			`UPDATE Session SET status = 'active' WHERE id = $1 RETURNING *`,
			[id]
		);

		res.status(200).json({
			message: 'Session started and face embeddings loaded to AI successfully!',
			data: updatedSession.rows[0]
		});
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ message: 'Server error while starting session' });
	}
};

// @desc    Kết thúc buổi học & Giải phóng RAM cho AI
// @route   PATCH /api/sessions/:id/stop
// @access  Private
exports.stopSession = async (req, res) => {
	const { id } = req.params;

	try {
		const updatedSession = await pool.query(
			`UPDATE Session SET status = 'completed' WHERE id = $1 RETURNING *`,
			[id]
		);
		if (updatedSession.rows.length === 0) {
			return res.status(404).json({ message: 'Session not found!' });
		}

		const { aiServiceUrl, aiServiceToken } = resolveAiConfig();
		try {
			await axios.post(`${aiServiceUrl}/ai/unload-embeddings`, {
				session_id: String(id)
			}, {
				headers: {
					'X-Service-Token': aiServiceToken,
				},
			});
		} catch (aiError) {
			console.error("AI Service error (unload embeddings):", aiError.message);
		}

		res.status(200).json({
			message: 'Session stopped successfully!',
			data: updatedSession.rows[0]
		});
	} catch (error) {
		console.error(error.message);
		res.status(500).json({ message: 'Server error while stopping session' });
	}
};

// @desc    Xóa buổi học
// @route   DELETE /api/sessions/:id
// @access  Private
exports.deleteSession = async (req, res) => {
	const { id } = req.params;

	try {
		const existing = await pool.query('SELECT id FROM Session WHERE id = $1', [id]);
		if (existing.rows.length === 0) {
			return res.status(404).json({ message: 'Session not found for delete!' });
		}

		const deleted = await pool.query(
			`DELETE FROM Session WHERE id = $1 RETURNING *`,
			[id]
		);

		const { aiServiceUrl, aiServiceToken } = resolveAiConfig();
		try {
			await axios.post(`${aiServiceUrl}/ai/unload-embeddings`, {
				session_id: String(id)
			}, {
				headers: {
					'X-Service-Token': aiServiceToken,
				},
			});
		} catch (aiError) {
			console.error('AI Service error (unload on delete session):', aiError.message);
		}

		return res.status(200).json({
			message: 'Session deleted successfully!',
			data: deleted.rows[0],
		});
	} catch (error) {
		console.error(error.message);
		return res.status(500).json({ message: 'Server error while deleting session' });
	}
};