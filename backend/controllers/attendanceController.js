const pool = require('../config/db');
const axios = require('axios');

function isPrivilegedRole(role) {
    const normalized = String(role || '').toLowerCase();
    return normalized === 'teacher' || normalized === 'admin';
}

function ensureStudentAccess(req, res, targetStudentId) {
    const role = String(req.user?.role || '').toLowerCase();
    const actorId = Number(req.user?.id);
    const targetId = Number(targetStudentId);

    if (!Number.isFinite(targetId) || targetId <= 0) {
        res.status(400).json({ message: 'Invalid student id' });
        return false;
    }

    if (role === 'student' && actorId !== targetId) {
        res.status(403).json({ message: 'Students can only access their own attendance data' });
        return false;
    }

    return true;
}

function resolveAiConfig() {
    return {
        aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
        aiServiceToken: process.env.AI_SERVICE_TOKEN || process.env.API_TOKEN || 'change_me',
    };
}

function toNumeric(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

// @desc    Nhận kết quả điểm danh (thường do hệ thống AI gọi)
// @route   POST /api/attendance/check-in
// @access  Private (Chỉ giảng viên mở buổi học mới được điểm danh)
exports.checkIn = async (req, res) => {
    const { session_id, student_id, confidence_score } = req.body;

    try {
        if (!session_id || !student_id) {
            return res.status(400).json({ message: 'Missing session_id or student_id' });
        }

        const confidence = Number(confidence_score);
        if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
            return res.status(422).json({
                message: 'Invalid confidence value. Confidence must be between 0 and 1.',
            });
        }

        const minConfidence = Number(process.env.ATTENDANCE_MIN_CONFIDENCE || 0.82);
        if (confidence < minConfidence) {
            return res.status(422).json({
                message: `Low confidence (${confidence.toFixed(2)} < ${minConfidence.toFixed(2)}). Please look straight, avoid face occlusion, and improve lighting.`,
            });
        }

        const studentCheck = await pool.query(
            `SELECT s.id,
                    EXISTS(SELECT 1 FROM Face_embeddings f WHERE f.student_id = s.id) AS has_face_data
             FROM Student s
             WHERE s.id = $1`,
            [student_id]
        );
        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found for attendance check-in!' });
        }
        if (!studentCheck.rows[0].has_face_data) {
            return res.status(422).json({ message: 'Student has no enrolled face data. Realtime check-in is unavailable.' });
        }

        const sessionCheck = await pool.query(
            `SELECT status, (session_date + start_time) AS start_datetime
            FROM Session WHERE id = $1`,
            [session_id]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Session not found!' });
        }
        if (sessionCheck.rows[0].status !== 'active') {
            return res.status(400).json({ message: 'Session is not active (not started or already ended)!' });
        }

        const startDatetime = new Date(sessionCheck.rows[0].start_datetime);
        const now = new Date();

        const graceMinutes = process.env.GRACE_PERIOD_MINUTES || 15;

        const allowedTime = new Date(startDatetime.getTime());
        allowedTime.setMinutes(allowedTime.getMinutes() + Number(graceMinutes));

        const calculatedStatus = now > allowedTime ? 'late' : 'present';

        // Keep the first check-in timestamp. If scanned again, only improve confidence.
        const result = await pool.query(
            `INSERT INTO Attendance (session_id, student_id, status, confidence_score) 
            VALUES ($1, $2, $3, $4) 
            ON CONFLICT (session_id, student_id) 
            DO UPDATE SET 
                confidence_score = GREATEST(Attendance.confidence_score, EXCLUDED.confidence_score)
            RETURNING *, (xmax = 0) AS inserted`,
            [session_id, student_id, calculatedStatus, confidence]
        );
        const inserted = Boolean(result.rows[0]?.inserted);
        res.status(200).json({
            message: inserted
                ? (calculatedStatus === 'late' ? 'Recorded: Late attendance!' : 'Recorded: Present attendance!')
                : 'Student already checked in. The original check-in time is preserved.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while processing attendance' });
    }
};

// @desc    Nhận diện nhiều khuôn mặt realtime theo session đang active
// @route   POST /api/attendance/recognize
// @access  Private
exports.recognizeRealtime = async (req, res) => {
    const { session_id, image_base64, min_similarity } = req.body;

    try {
        if (!session_id || !image_base64) {
            return res.status(400).json({ message: 'Missing session_id or image_base64' });
        }

        const sessionCheck = await pool.query(
            `SELECT id, status FROM Session WHERE id = $1`,
            [session_id]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Session not found!' });
        }
        if (sessionCheck.rows[0].status !== 'active') {
            return res.status(400).json({ message: 'Session is not active. Please start the session before realtime scanning.' });
        }

        const threshold = toNumeric(min_similarity, toNumeric(process.env.ATTENDANCE_MIN_CONFIDENCE, 0.82));
        const minFaceQuality = toNumeric(process.env.ATTENDANCE_MIN_FACE_QUALITY, 0.75);
        const minFaceAreaRatio = toNumeric(process.env.ATTENDANCE_MIN_FACE_AREA_RATIO, 0.03);
        const { aiServiceUrl, aiServiceToken } = resolveAiConfig();

        let aiResponse;
        try {
            aiResponse = await axios.post(
                `${aiServiceUrl}/ai/recognize`,
                {
                    session_id: String(session_id),
                    image_base64,
                    min_similarity: threshold,
                    top_k: 1,
                },
                {
                    headers: {
                        'X-Service-Token': aiServiceToken,
                    },
                }
            );
        } catch (aiError) {
            const statusCode = aiError?.response?.status;
            const detail = aiError?.response?.data?.detail;
            const detailCode = typeof detail?.error_code === 'string' ? detail.error_code : null;
            const detailMessage = typeof detail?.message === 'string' ? detail.message : null;

            if (statusCode === 404 && detailCode === 'SESSION_NOT_LOADED') {
                return res.status(409).json({ message: 'Session embeddings are not loaded in AI. Please start the session again.' });
            }

            if (statusCode && statusCode >= 400 && statusCode < 500) {
                return res.status(422).json({ message: detailMessage || 'Invalid frame for recognition.' });
            }

            return res.status(503).json({ message: 'AI Service is unavailable during realtime recognition.' });
        }

        const aiResults = Array.isArray(aiResponse?.data?.results) ? aiResponse.data.results : [];

        const matchedIds = Array.from(
            new Set(
                aiResults
                    .filter((item) => item?.status === 'matched' && item?.student_id)
                    .map((item) => Number(item.student_id))
                    .filter((id) => Number.isFinite(id) && id > 0)
            )
        );

        const studentNameMap = new Map();
        if (matchedIds.length > 0) {
            const students = await pool.query(
                `SELECT id, student_code, name FROM Student WHERE id = ANY($1::int[])`,
                [matchedIds]
            );
            students.rows.forEach((row) => {
                studentNameMap.set(Number(row.id), {
                    student_code: row.student_code,
                    name: row.name,
                });
            });
        }

        const detections = [];
        const checkedIn = [];

        for (const item of aiResults) {
            const similarity = toNumeric(item?.similarity, 0);
            const qualityScore = toNumeric(item?.quality_score, 0);
            const faceAreaRatio = toNumeric(item?.face_area_ratio, 0);
            const bbox = Array.isArray(item?.bbox) ? item.bbox.map((v) => Number(v)) : [0, 0, 0, 0];
            const isMatched = item?.status === 'matched' && item?.student_id;

            if (!isMatched) {
                detections.push({
                    status: 'unknown',
                    student_id: null,
                    student_code: null,
                    name: 'Unknown',
                    similarity,
                    bbox,
                    reason: 'Identity could not be determined',
                });
                continue;
            }

            const studentId = Number(item.student_id);
            const studentInfo = studentNameMap.get(studentId);

            if (!studentInfo) {
                detections.push({
                    status: 'rejected',
                    student_id: studentId,
                    student_code: null,
                    name: 'Unknown',
                    similarity,
                    bbox,
                    reason: 'Student is not in the valid recognition dataset',
                });
                continue;
            }

            if (similarity < threshold) {
                detections.push({
                    status: 'rejected',
                    student_id: studentId,
                    student_code: studentInfo.student_code,
                    name: studentInfo.name,
                    similarity,
                    quality_score: qualityScore,
                    face_area_ratio: faceAreaRatio,
                    bbox,
                    reason: `Low similarity (${similarity.toFixed(2)} < ${threshold.toFixed(2)})`,
                });
                continue;
            }

            if (qualityScore < minFaceQuality) {
                detections.push({
                    status: 'rejected',
                    student_id: studentId,
                    student_code: studentInfo.student_code,
                    name: studentInfo.name,
                    similarity,
                    quality_score: qualityScore,
                    face_area_ratio: faceAreaRatio,
                    bbox,
                    reason: `Low face quality (${qualityScore.toFixed(2)} < ${minFaceQuality.toFixed(2)}). Please look straight and improve lighting.`,
                });
                continue;
            }

            if (faceAreaRatio < minFaceAreaRatio) {
                detections.push({
                    status: 'rejected',
                    student_id: studentId,
                    student_code: studentInfo.student_code,
                    name: studentInfo.name,
                    similarity,
                    quality_score: qualityScore,
                    face_area_ratio: faceAreaRatio,
                    bbox,
                    reason: `Face is too small in frame (${faceAreaRatio.toFixed(3)} < ${minFaceAreaRatio.toFixed(3)}).`,
                });
                continue;
            }

            const attendance = await pool.query(
                `INSERT INTO Attendance (session_id, student_id, status, confidence_score)
                 VALUES ($1, $2, 'present', $3)
                 ON CONFLICT (session_id, student_id)
                 DO UPDATE SET
                    confidence_score = GREATEST(Attendance.confidence_score, EXCLUDED.confidence_score)
                 RETURNING id, session_id, student_id, status, confidence_score, check_in_time, (xmax = 0) AS inserted`,
                [session_id, studentId, similarity]
            );

            const attendanceRow = attendance.rows[0];
            const inserted = Boolean(attendanceRow?.inserted);

            if (inserted) {
                checkedIn.push(attendanceRow);
            }

            detections.push({
                status: inserted ? 'matched' : 'rejected',
                student_id: studentId,
                student_code: studentInfo.student_code,
                name: studentInfo.name,
                similarity,
                quality_score: qualityScore,
                face_area_ratio: faceAreaRatio,
                bbox,
                reason: inserted
                    ? 'Check-in successful'
                    : `Already checked in (${new Date(attendanceRow.check_in_time).toLocaleTimeString('en-GB', { hour12: false })})`,
            });
        }

        return res.status(200).json({
            message: detections.length === 0 ? 'No face detected in the current frame.' : 'Realtime recognition completed.',
            data: {
                session_id: Number(session_id),
                threshold,
                detections,
                checked_in: checkedIn,
            },
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error during realtime recognition' });
    }
};

// @desc    Check-in 1 khuôn mặt: bắt buộc khớp đúng sinh viên được chọn
// @route   POST /api/attendance/check-in-one-face
// @access  Private
exports.checkInOneFace = async (req, res) => {
    const { session_id, student_id, image_base64, min_similarity } = req.body;

    try {
        if (!session_id || !student_id || !image_base64) {
            return res.status(400).json({ message: 'Missing session_id, student_id, or image_base64' });
        }

        const sessionCheck = await pool.query(
            `SELECT status, (session_date + start_time) AS start_datetime FROM Session WHERE id = $1`,
            [session_id]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Session not found!' });
        }
        if (sessionCheck.rows[0].status !== 'active') {
            return res.status(400).json({ message: 'Session is not active. Please start the session before check-in.' });
        }

        const studentCheck = await pool.query(
            `SELECT id, student_code, name,
                    EXISTS(SELECT 1 FROM Face_embeddings f WHERE f.student_id = s.id) AS has_face_data
             FROM Student s
             WHERE id = $1`,
            [student_id]
        );
        
        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found!' });
        }
        if (!studentCheck.rows[0].has_face_data) {
            return res.status(422).json({ message: 'Student has no enrolled face data.' });
        }

        const threshold = toNumeric(min_similarity, toNumeric(process.env.ATTENDANCE_MIN_CONFIDENCE, 0.82));
        const minFaceQuality = toNumeric(process.env.ATTENDANCE_MIN_FACE_QUALITY, 0.75);
        const minFaceAreaRatio = toNumeric(process.env.ATTENDANCE_MIN_FACE_AREA_RATIO, 0.03);
        const { aiServiceUrl, aiServiceToken } = resolveAiConfig();

        let aiResponse;
        try {
            aiResponse = await axios.post(
                `${aiServiceUrl}/ai/recognize`,
                {
                    session_id: String(session_id),
                    image_base64,
                    min_similarity: threshold,
                    top_k: 1,
                },
                {
                    headers: {
                        'X-Service-Token': aiServiceToken,
                    },
                }
            );
        } catch (aiError) {
            const statusCode = aiError?.response?.status;
            const detail = aiError?.response?.data?.detail;
            const detailCode = typeof detail?.error_code === 'string' ? detail.error_code : null;
            const detailMessage = typeof detail?.message === 'string' ? detail.message : null;

            if (statusCode === 404 && detailCode === 'SESSION_NOT_LOADED') {
                return res.status(409).json({ message: 'Session embeddings are not loaded in AI. Please start the session again.' });
            }

            if (statusCode && statusCode >= 400 && statusCode < 500) {
                return res.status(422).json({ message: detailMessage || 'Invalid frame for recognition.' });
            }

            return res.status(503).json({ message: 'AI Service is unavailable during one-face check-in.' });
        }

        const results = Array.isArray(aiResponse?.data?.results) ? aiResponse.data.results : [];
        if (results.length === 0) {
            return res.status(422).json({ message: 'No face detected in the frame.' });
        }
        if (results.length > 1) {
            return res.status(422).json({ message: 'Multiple faces detected. One-face check-in requires exactly one face in frame.' });
        }

        const face = results[0];
        const similarity = toNumeric(face?.similarity, 0);
        const qualityScore = toNumeric(face?.quality_score, 0);
        const faceAreaRatio = toNumeric(face?.face_area_ratio, 0);

        if (face?.status !== 'matched' || Number(face?.student_id) !== Number(student_id)) {
            return res.status(422).json({ message: 'Face does not match the selected student.' });
        }
        if (similarity < threshold) {
            return res.status(422).json({ message: `Low similarity (${similarity.toFixed(2)} < ${threshold.toFixed(2)}).` });
        }
        if (qualityScore < minFaceQuality) {
            return res.status(422).json({ message: `Low face quality (${qualityScore.toFixed(2)} < ${minFaceQuality.toFixed(2)}).` });
        }
        if (faceAreaRatio < minFaceAreaRatio) {
            return res.status(422).json({ message: `Face is too small in frame (${faceAreaRatio.toFixed(3)} < ${minFaceAreaRatio.toFixed(3)}).` });
        }

        const startDatetime = new Date(sessionCheck.rows[0].start_datetime);
        const now = new Date();
        const graceMinutes = process.env.GRACE_PERIOD_MINUTES || 15;
        const allowedTime = new Date(startDatetime.getTime());
        allowedTime.setMinutes(allowedTime.getMinutes() + Number(graceMinutes));
        const calculatedStatus = now > allowedTime ? 'late' : 'present';

        const attendance = await pool.query(
            `INSERT INTO Attendance (session_id, student_id, status, confidence_score)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (session_id, student_id)
             DO UPDATE SET
                confidence_score = GREATEST(Attendance.confidence_score, EXCLUDED.confidence_score)
             RETURNING *, (xmax = 0) AS inserted`,
            [session_id, student_id, calculatedStatus, similarity]
        );

        const inserted = Boolean(attendance.rows[0]?.inserted);

        return res.status(200).json({
            message: inserted
                ? 'One-face check-in successful.'
                : 'Student already checked in. The original check-in time is preserved.',
            data: attendance.rows[0],
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error during one-face check-in' });
    }
};

// @desc    Lấy báo cáo điểm danh của 1 buổi học
// @route   GET /api/attendance/session/:session_id
// @access  Private
exports.getAttendanceBySession = async (req, res) => {
    const { session_id } = req.params;

    if (!isPrivilegedRole(req.user?.role)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }

    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Surrogate-Control', 'no-store');

        const result = await pool.query(
            `SELECT
                a.*,
                s.student_code,
                s.name,
                s.email,
                hc.class_code AS home_class_code,
                hc.major AS home_class_major,
                hc.department AS home_class_department,
                se.session_date,
                se.start_time,
                se.end_time,
                se.status AS session_status,
                cc.course_code,
                cc.course_name,
                cc.teacher_id,
                t.teacher_name
            FROM Attendance a
            JOIN Student s ON a.student_id = s.id
            LEFT JOIN Home_class hc ON s.home_class_id = hc.id
            JOIN Session se ON a.session_id = se.id
            JOIN Course_classes cc ON se.course_class_id = cc.id
            LEFT JOIN Teacher t ON cc.teacher_id = t.id
            WHERE a.session_id = $1
            ORDER BY a.check_in_time DESC`,
            [session_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while fetching session attendance report' });
    }
};

// @desc    Giảng viên cập nhật trạng thái điểm danh thủ công (Duyệt đơn xin phép, sửa lỗi)
// @route   PUT /api/attendance/update-status
// @access  Private
exports.updateAttendanceStatus = async (req, res) => {
    const { session_id, student_id, new_status } = req.body;

    if (!isPrivilegedRole(req.user?.role)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }

    try {
        const result = await pool.query(
            `UPDATE Attendance 
            SET status = $1 
            WHERE session_id = $2 AND student_id = $3 
            RETURNING *`,
            [new_status, session_id, student_id]
        );

        if (result.rows.length === 0) {
            const insertResult = await pool.query(
                `INSERT INTO Attendance (session_id, student_id, status) 
                VALUES ($1, $2, $3) RETURNING *`,
                [session_id, student_id, new_status]
            )
            return res.status(200).json({ message: 'Attendance status updated!', data: insertResult.rows[0] });
        }
        res.status(200).json({ message: 'Attendance status updated!', data: result.rows[0] });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while updating attendance status' });
    }
};

// @desc    Lấy báo cáo chuyên cần và cảnh báo cấm thi của 1 lớp học (Course)
// @route   GET /api/attendance/report/:course_class_id
// @access  Private
exports.getAttendanceReport = async (req, res) => {
    const { course_class_id } = req.params;

    if (!isPrivilegedRole(req.user?.role)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }

    try {
        const reportQuery = `
            WITH SessionCount AS (
                -- Đếm tổng số buổi học đã diễn ra (status = completed hoặc active) của môn này
                SELECT COUNT(id) AS total_sessions 
                FROM Session 
                WHERE course_class_id = $1 AND status != 'scheduled'
            ),
            StudentAbsences AS (
                -- Đếm số buổi vắng của từng sinh viên
                SELECT a.student_id, COUNT(a.id) AS absent_count
                FROM Attendance a
                JOIN Session s ON a.session_id = s.id
                WHERE s.course_class_id = $1 AND a.status = 'absent'
                GROUP BY a.student_id
            )
            SELECT
                st.id AS student_id,
                st.student_code,
                st.name,
                COALESCE(sc.total_sessions, 0) AS total_sessions,
                COALESCE(sa.absent_count, 0) AS absent_count,
                -- Tính phần trăm vắng mặt
                CASE
                    WHEN COALESCE(sc.total_sessions, 0) = 0 THEN 0
                    ELSE ROUND((COALESCE(sa.absent_count, 0)::decimal / sc.total_sessions) * 100, 2)
                END AS absence_percentage
            FROM Enrollments e
            JOIN Student st ON e.student_id = st.id
            CROSS JOIN SessionCount sc
            LEFT JOIN StudentAbsences sa ON st.id = sa.student_id
            WHERE e.course_class_id = $1;
        `;

        const result = await pool.query(reportQuery, [course_class_id]);

        const reportData = result.rows.map(row => {
            const isBanned = parseFloat(row.absence_percentage) > 20.00;
            return {
                ...row,
                status: isBanned ? 'Banned' : 'Good'
            };
        });

        res.status(200).json({
            message: 'Attendance report fetched successfully',
            data: reportData
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while generating attendance report' });
    }
}

// @desc    Xem lịch sử điểm danh của 1 sinh viên (Phục vụ xuất cảnh báo cấm thi)
// @route   GET /api/attendance/student/:student_id
// @access  Private
exports.getStudentAttendanceHistory = async (req, res) => {
    const { student_id } = req.params;
    const { course_class_id } = req.query;

    if (!ensureStudentAccess(req, res, student_id)) {
        return;
    }

    try {
        let query = `
            SELECT a.id AS attendance_id, a.status, a.check_in_time, 
                   s.session_date, s.start_time, s.end_time,
                   c.course_name, c.course_code
            FROM Attendance a
            JOIN Session s ON a.session_id = s.id
            JOIN Course_classes c ON s.course_class_id = c.id
            WHERE a.student_id = $1
        `;
        let values = [student_id];

        if (course_class_id) {
            query += ` AND s.course_class_id = $2`;
            values.push(course_class_id);
        }

        query += ` ORDER BY s.session_date DESC, s.start_time DESC`;

        const result = await pool.query(query, values);

        res.status(200).json({
            message: 'Attendance history fetched successfully',
            data: result.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while fetching attendance history' });
    }
};

// @desc    Sinh viên xem lịch sử điểm danh của chính mình
// @route   GET /api/attendance/me
// @access  Private (student)
exports.getMyAttendanceHistory = async (req, res) => {
    const studentId = Number(req.user?.id);
    req.params.student_id = String(studentId);
    return exports.getStudentAttendanceHistory(req, res);
};

// @desc    Sinh viên xem dashboard cá nhân (today + timetable + summary)
// @route   GET /api/attendance/me/dashboard
// @access  Private (student)
exports.getMyDashboard = async (req, res) => {
    const studentId = Number(req.user?.id);

    if (!Number.isFinite(studentId) || studentId <= 0) {
        return res.status(401).json({ message: 'Invalid student session' });
    }

    const from = String(req.query?.from || '').trim();
    const to = String(req.query?.to || '').trim();

    const timetableFrom = /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : null;
    const timetableTo = /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : null;

    try {
        const todayRows = await pool.query(
            `SELECT
                se.id AS session_id,
                se.session_date,
                se.start_time,
                se.end_time,
                se.status AS session_status,
                cc.id AS course_class_id,
                cc.course_code,
                cc.course_name,
                t.teacher_name,
                a.id AS attendance_id,
                a.status AS attendance_status,
                a.check_in_time,
                CASE
                    WHEN se.status = 'canceled' THEN 'canceled'
                    WHEN a.status IS NOT NULL THEN a.status::text
                    WHEN (se.session_date + se.end_time) < (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') THEN 'absent'
                    WHEN (se.session_date + se.start_time) <= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
                         AND (se.session_date + se.end_time) >= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') THEN 'ongoing'
                    ELSE 'upcoming'
                END AS display_status
            FROM Enrollments e
            JOIN Session se ON se.course_class_id = e.course_class_id
            JOIN Course_classes cc ON cc.id = se.course_class_id
            LEFT JOIN Teacher t ON t.id = cc.teacher_id
            LEFT JOIN Attendance a ON a.session_id = se.id AND a.student_id = e.student_id
            WHERE e.student_id = $1
              AND se.session_date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
            ORDER BY se.start_time ASC`,
            [studentId]
        );

        const timetableRows = await pool.query(
            `SELECT
                se.id AS session_id,
                se.session_date,
                se.start_time,
                se.end_time,
                se.status AS session_status,
                cc.id AS course_class_id,
                cc.course_code,
                cc.course_name,
                t.teacher_name,
                a.status AS attendance_status,
                a.check_in_time
            FROM Enrollments e
            JOIN Session se ON se.course_class_id = e.course_class_id
            JOIN Course_classes cc ON cc.id = se.course_class_id
            LEFT JOIN Teacher t ON t.id = cc.teacher_id
            LEFT JOIN Attendance a ON a.session_id = se.id AND a.student_id = e.student_id
            WHERE e.student_id = $1
              AND se.session_date BETWEEN COALESCE($2::date, (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
                                  AND COALESCE($3::date, ((NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + INTERVAL '14 day')::date)
            ORDER BY se.session_date ASC, se.start_time ASC`,
            [studentId, timetableFrom, timetableTo]
        );

        const summaryRows = await pool.query(
            `SELECT
                se.id AS session_id,
                se.status AS session_status,
                cc.id AS course_class_id,
                cc.course_code,
                cc.course_name,
                a.status AS attendance_status
            FROM Enrollments e
            JOIN Session se ON se.course_class_id = e.course_class_id
            JOIN Course_classes cc ON cc.id = se.course_class_id
            LEFT JOIN Attendance a ON a.session_id = se.id AND a.student_id = e.student_id
            WHERE e.student_id = $1
              AND se.status <> 'canceled'
              AND (se.session_date + se.end_time) <= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
            ORDER BY se.session_date DESC, se.start_time DESC`,
            [studentId]
        );

        const summarySeed = {
            total_sessions: 0,
            attended_sessions: 0,
            present_count: 0,
            late_count: 0,
            excused_count: 0,
            absent_count: 0,
        };

        const summary = summaryRows.rows.reduce((acc, row) => {
            const attendanceStatus = String(row.attendance_status || '').toLowerCase();
            acc.total_sessions += 1;

            if (attendanceStatus === 'present') {
                acc.present_count += 1;
                acc.attended_sessions += 1;
            } else if (attendanceStatus === 'late') {
                acc.late_count += 1;
                acc.attended_sessions += 1;
            } else if (attendanceStatus === 'excused') {
                acc.excused_count += 1;
                acc.attended_sessions += 1;
            } else {
                acc.absent_count += 1;
            }

            return acc;
        }, summarySeed);

        const attendanceRate = summary.total_sessions > 0
            ? Number(((summary.attended_sessions / summary.total_sessions) * 100).toFixed(2))
            : 0;

        const byCourseMap = new Map();
        for (const row of summaryRows.rows) {
            const key = Number(row.course_class_id);
            if (!byCourseMap.has(key)) {
                byCourseMap.set(key, {
                    course_class_id: key,
                    course_code: row.course_code,
                    course_name: row.course_name,
                    total_sessions: 0,
                    attended_sessions: 0,
                    absent_count: 0,
                    attendance_rate: 0,
                });
            }

            const item = byCourseMap.get(key);
            const attendanceStatus = String(row.attendance_status || '').toLowerCase();
            item.total_sessions += 1;
            if (attendanceStatus === 'present' || attendanceStatus === 'late' || attendanceStatus === 'excused') {
                item.attended_sessions += 1;
            } else {
                item.absent_count += 1;
            }
        }

        const course_stats = Array.from(byCourseMap.values()).map((item) => ({
            ...item,
            attendance_rate: item.total_sessions > 0
                ? Number(((item.attended_sessions / item.total_sessions) * 100).toFixed(2))
                : 0,
        }));

        const checkedInCount = todayRows.rows.filter((row) => {
            const status = String(row.attendance_status || '').toLowerCase();
            return status === 'present' || status === 'late' || status === 'excused';
        }).length;

        return res.status(200).json({
            today: {
                date: new Date().toISOString().slice(0, 10),
                total_sessions: todayRows.rows.length,
                checked_in_sessions: checkedInCount,
                remaining_sessions: Math.max(todayRows.rows.length - checkedInCount, 0),
                sessions: todayRows.rows,
            },
            timetable: {
                from: timetableFrom,
                to: timetableTo,
                sessions: timetableRows.rows,
            },
            summary: {
                ...summary,
                attendance_rate: attendanceRate,
            },
            course_stats,
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error while loading student dashboard' });
    }
};

// @desc    Giảng viên điểm danh thủ công (Dùng khi AI không nhận diện được)
// @route   POST /api/attendance/manual
// @access  Private
exports.manualCheckIn = async (req, res) => {
    const { session_id, student_id, status } = req.body;

    if (!isPrivilegedRole(req.user?.role)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO Attendance (session_id, student_id, status) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (session_id, student_id) 
             DO UPDATE SET 
                 status = EXCLUDED.status,
                 check_in_time = CURRENT_TIMESTAMP
             RETURNING *`,
            [session_id, student_id, status]
        );
        res.status(200).json({
            message: 'Manual attendance updated successfully!',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error during manual attendance update' });
    }
};

// @desc    Sửa trạng thái điểm danh (Dựa trên ID của bản ghi Attendance)
// @route   PUT /api/attendance/:id
// @access  Private
exports.updateAttendanceById = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!isPrivilegedRole(req.user?.role)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }

    try {
        const result = await pool.query(
            `UPDATE Attendance 
             SET status = $1 
             WHERE id = $2 
             RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Attendance record not found!' });
        }

        res.status(200).json({
            message: 'Attendance status updated successfully!',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error while updating attendance status' });
    }
};