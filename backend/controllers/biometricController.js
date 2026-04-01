const pool = require('../config/db');
const axios = require('axios');
const FormData = require('form-data');

// @desc    Kiểm tra sinh viên đã đăng ký khuôn mặt chưa
// @route   GET /api/biometrics/student/:student_id
// @access  Private
exports.checkEnrollment = async (req, res) => {
    const { student_id } = req.params;

    try {
        const result = await pool.query(
            'SELECT id, created_at FROM Face_embeddings WHERE student_id = $1',
            [student_id]
        )

        res.status(200).json({
            message: 'Kiểm tra trạng thái sinh trắc học',
            has_face_data: result.rows.length > 0,
            data: result.rows[0] || null
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi kiểm tra khuôn mặt' });
    }
};

// @desc    Upload ảnh, gọi AI lấy Vector và lưu vào DB
// @route   POST /api/biometrics/enroll
// @access  Private
exports.enrollFace = async (req, res) => {
    const {student_id} = req.body;

    if (!req.file || !student_id) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đủ student_id và file ảnh!' });
    }

    try {
        const formData = new FormData();
        formData.append('file', req.file.buffer, req.file.originalname);

        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

        let aiResponse;
        try {
            aiResponse = await axios.post(`${aiServiceUrl}/ai/encode`, formData, {
                headers: { ...formData.getHeaders() }
            });
        } catch (aiError) {
            console.error("Lỗi kết nối AI Service:", aiError.message);
            return res.status(503).json({ message: 'AI Service (Python) đang không phản hồi hoặc chưa bật!' });
        }

        const embeddingVector = aiResponse.data.vector;
        const vectorString = `[${embeddingVector.join(',')}]`;
        const result = await pool.query(
            `INSERT INTO Face_embeddings (student_id, embedding, quality_score) 
             VALUES ($1, $2, $3)
             ON CONFLICT (student_id) 
             DO UPDATE SET 
                embedding = EXCLUDED.embedding, 
                quality_score = EXCLUDED.quality_score, 
                created_at = CURRENT_TIMESTAMP
             RETURNING id, student_id, quality_score`,
            [student_id, vectorString, aiResponse.data.quality_score || 0.99]
        );
        res.status(200).json({
            message: 'Đăng ký khuôn mặt thành công!',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi đăng ký khuôn mặt' });
    }
};