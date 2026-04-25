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

// @desc    Lấy lịch sử đăng ký khuôn mặt của sinh viên
// @route   GET /api/biometrics/student/:student_id/history
// @access  Private
exports.getEnrollmentHistory = async (req, res) => {
    const { student_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT id, student_id, quality_score, created_at
             FROM Face_embeddings
             WHERE student_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [student_id]
        );

        return res.status(200).json({
            message: 'Biometric enrollment history fetched',
            data: result.rows,
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error while fetching face enrollment history' });
    }
};

// @desc    Xóa toàn bộ lịch sử đăng ký khuôn mặt của sinh viên
// @route   DELETE /api/biometrics/student/:student_id
// @access  Private
exports.deleteEnrollmentHistoryByStudent = async (req, res) => {
    const { student_id } = req.params;
    const normalizedStudentId = Number(student_id);

    if (!Number.isInteger(normalizedStudentId) || normalizedStudentId <= 0) {
        return res.status(400).json({ message: 'Invalid student_id' });
    }

    try {
        const deleted = await pool.query(
            `DELETE FROM Face_embeddings WHERE student_id = $1 RETURNING id`,
            [normalizedStudentId]
        );

        return res.status(200).json({
            message: deleted.rowCount > 0
                ? `Deleted ${deleted.rowCount} face enrollment record(s).`
                : 'No face enrollment records found for this student.',
            deleted_count: deleted.rowCount,
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error while deleting face enrollment history' });
    }
};

// @desc    Xóa 1 bản ghi đăng ký khuôn mặt theo enrollment id
// @route   DELETE /api/biometrics/enrollment/:enrollment_id
// @access  Private
exports.deleteEnrollmentById = async (req, res) => {
    const { enrollment_id } = req.params;
    const normalizedEnrollmentId = Number(enrollment_id);

    if (!Number.isInteger(normalizedEnrollmentId) || normalizedEnrollmentId <= 0) {
        return res.status(400).json({ message: 'Invalid enrollment_id' });
    }

    try {
        const deleted = await pool.query(
            `DELETE FROM Face_embeddings WHERE id = $1 RETURNING id, student_id`,
            [normalizedEnrollmentId]
        );

        if (deleted.rows.length === 0) {
            return res.status(404).json({ message: 'Face enrollment record not found.' });
        }

        return res.status(200).json({
            message: 'Face enrollment record deleted successfully.',
            data: deleted.rows[0],
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error while deleting face enrollment record' });
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

    const normalizedStudentId = Number(student_id);
    if (!Number.isInteger(normalizedStudentId) || normalizedStudentId <= 0) {
        return res.status(400).json({ message: 'Invalid student_id. Please select a valid student.' });
    }

    try {
        const studentCheck = await pool.query(
            `SELECT id, student_code, name
             FROM Student
             WHERE id = $1`,
            [normalizedStudentId]
        );

        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found for face enrollment.' });
        }

        const formData = new FormData();
        formData.append('student_id', String(normalizedStudentId));
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

        const numericEmbedding = embeddingVector.map((value) => Number(value));
        if (numericEmbedding.some((value) => !Number.isFinite(value))) {
            return res.status(422).json({ message: 'AI Service returned non-finite embedding values.' });
        }

        const norm = Math.sqrt(numericEmbedding.reduce((sum, value) => sum + (value * value), 0));
        if (!Number.isFinite(norm) || norm <= 0) {
            return res.status(422).json({ message: 'AI Service returned zero/invalid embedding norm.' });
        }

        const normalizedEmbedding = numericEmbedding.map((value) => value / norm);

        const vectorString = `[${normalizedEmbedding.join(',')}]`;
        const qualityScore = Number(aiResponse?.data?.quality_score ?? 0.99);
        const minQuality = Number(process.env.BIOMETRIC_MIN_QUALITY || 0.75);
        if (Number.isFinite(qualityScore) && qualityScore < minQuality) {
            return res.status(422).json({
                message: `Low face quality (${qualityScore.toFixed(2)}). Please remove occlusions, look straight at the camera, and improve lighting.`,
            });
        }

        // If this student already has enrolled face data, re-enrollment must still match that identity.
        const existingSelf = await pool.query(
            `SELECT MAX(1 - (f.embedding <=> $1::vector)) AS similarity
             FROM Face_embeddings f
             WHERE f.student_id = $2`,
            [vectorString, normalizedStudentId]
        );

        const selfSimilarity = Number(existingSelf.rows[0]?.similarity ?? 0);
        const reenrollMinSimilarity = Number(process.env.BIOMETRIC_REENROLL_MIN_SIMILARITY || 0.60);
        const hasSelfEnrollment = existingSelf.rows[0]?.similarity !== null && existingSelf.rows[0]?.similarity !== undefined;
        if (hasSelfEnrollment && (!Number.isFinite(selfSimilarity) || selfSimilarity < reenrollMinSimilarity)) {
            return res.status(409).json({
                message: `This face does not match the previously enrolled profile for the selected student (similarity ${selfSimilarity.toFixed(3)} < ${reenrollMinSimilarity.toFixed(3)}). Enrollment blocked.`,
            });
        }

        // Guardrail: prevent registering a face that already matches another student.
        const duplicateSimilarityThreshold = Number(process.env.BIOMETRIC_DUPLICATE_SIMILARITY_THRESHOLD || 0.20);
        const strictUniqueness = String(process.env.BIOMETRIC_STRICT_UNIQUENESS || 'true').toLowerCase() !== 'false';
        const duplicateCheck = await pool.query(
            `SELECT s.id AS student_id,
                    s.student_code,
                    s.name,
                    MAX(1 - (f.embedding <=> $1::vector)) AS similarity
             FROM Face_embeddings f
             JOIN Student s ON s.id = f.student_id
             WHERE f.student_id <> $2
             GROUP BY s.id, s.student_code, s.name
             ORDER BY similarity DESC NULLS LAST
             LIMIT 1`,
            [vectorString, normalizedStudentId]
        );

        const topMatch = duplicateCheck.rows[0];
        const topSimilarity = Number(topMatch?.similarity ?? 0);
        if (topMatch && Number.isFinite(topSimilarity) && topSimilarity >= duplicateSimilarityThreshold) {
            if (strictUniqueness || !hasSelfEnrollment) {
                return res.status(409).json({
                    message: `This face is too similar to another student (${topMatch.student_code || `ID ${topMatch.student_id}`} - ${topMatch.name}, similarity ${topSimilarity.toFixed(3)}). Enrollment blocked to prevent wrong profile assignment.`,
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO Face_embeddings (student_id, embedding, quality_score)
             VALUES ($1, $2, $3)
             RETURNING id, student_id, quality_score, created_at`,
            [normalizedStudentId, vectorString, qualityScore]
        );

        res.status(200).json({
            message: 'Face enrollment completed successfully!',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while enrolling face data' });
    }
};