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
            'SELECT id, created_at, quality_score FROM Face_embeddings WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1',
            [student_id]
        )

        res.status(200).json({
            message: 'Biometric enrollment status checked',
            has_face_data: result.rows.length > 0,
            data: result.rows[0] || null
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while checking face enrollment' });
    }
};

// @desc    Upload ảnh, gọi AI lấy Vector và lưu vào DB
// @route   POST /api/biometrics/enroll
// @access  Private
exports.enrollFace = async (req, res) => {
    const { student_id } = req.body;

    if (!req.file || !student_id) {
        return res.status(400).json({ message: 'Please provide both student_id and image file!' });
    }

    try {
        const formData = new FormData();
        formData.append('student_id', String(student_id));
        formData.append('image', req.file.buffer, req.file.originalname);

        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const aiServiceToken = process.env.AI_SERVICE_TOKEN || process.env.API_TOKEN || 'change_me';

        let aiResponse;
        try {
            aiResponse = await axios.post(`${aiServiceUrl}/ai/encode`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'X-Service-Token': aiServiceToken,
                }
            });
        } catch (aiError) {
            const statusCode = aiError?.response?.status;
            const detail = aiError?.response?.data?.detail;
            const detailMessage = typeof detail?.message === 'string' ? detail.message : null;
            const detailCode = typeof detail?.error_code === 'string' ? detail.error_code : null;
            const fallbackMessage =
                aiError?.response?.data?.message ||
                aiError?.response?.data?.error ||
                aiError?.message ||
                'Unable to call AI Service';

            console.error('AI Service error:', fallbackMessage);

            if (statusCode === 401) {
                return res.status(503).json({ message: 'Invalid AI Service token. Please verify AI_SERVICE_TOKEN!' });
            }

            if (statusCode && statusCode >= 400 && statusCode < 500) {
                if (detailCode === 'NO_FACE_DETECTED') {
                    return res.status(422).json({ message: 'No face detected. Please face the camera, improve lighting, and avoid covering your face.' });
                }

                if (detailCode === 'MULTIPLE_FACES') {
                    return res.status(422).json({ message: 'Multiple faces detected. Please keep only one person in the frame.' });
                }

                if (detailCode === 'INVALID_IMAGE') {
                    return res.status(422).json({ message: 'Invalid image. Please capture a clearer frame and try again.' });
                }

                return res.status(422).json({ message: detailMessage || fallbackMessage });
            }

            return res.status(503).json({ message: 'AI Service (Python) is unavailable or not running!' });
        }

        const embeddingVector = aiResponse?.data?.embedding;
        if (!Array.isArray(embeddingVector) || embeddingVector.length === 0) {
            return res.status(422).json({ message: 'AI Service returned an invalid embedding vector' });
        }

        const vectorString = `[${embeddingVector.join(',')}]`;
        const qualityScore = Number(aiResponse?.data?.quality_score ?? 0.99);
        const minQuality = Number(process.env.BIOMETRIC_MIN_QUALITY || 0.75);
        if (Number.isFinite(qualityScore) && qualityScore < minQuality) {
            return res.status(422).json({
                message: `Low face quality (${qualityScore.toFixed(2)}). Please remove occlusions, look straight at the camera, and improve lighting.`,
            });
        }

        const existing = await pool.query(
            `SELECT id FROM Face_embeddings WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [student_id]
        );

        let result;
        if (existing.rows.length > 0) {
            result = await pool.query(
                `UPDATE Face_embeddings
                 SET embedding = $1,
                     quality_score = $2,
                     created_at = CURRENT_TIMESTAMP
                 WHERE id = $3
                 RETURNING id, student_id, quality_score, created_at`,
                [vectorString, qualityScore, existing.rows[0].id]
            );
        } else {
            result = await pool.query(
                `INSERT INTO Face_embeddings (student_id, embedding, quality_score)
                 VALUES ($1, $2, $3)
                 RETURNING id, student_id, quality_score, created_at`,
                [student_id, vectorString, qualityScore]
            );
        }

        res.status(200).json({
            message: 'Face enrollment completed successfully!',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while enrolling face data' });
    }
};