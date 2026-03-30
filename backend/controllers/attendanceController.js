const pool = require('../config/db');

// @desc    Nhận kết quả điểm danh (thường do hệ thống AI gọi)
// @route   POST /api/attendance/check-in
// @access  Private (Chỉ giảng viên mở buổi học mới được điểm danh)
exports.checkIn = async (req, res) => {
    const {session_id, student_id, confidence_score} = req.body;

    try {
        const sessionCheck = await pool.query(
            `SELECT status, (session_date + start_time) AS start_datetime
            FROM Session WHERE id = $1`,
            [session_id]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy buổi học!' });
        }
        if (sessionCheck.rows[0].status !== 'active') {
            return res.status(400).json({ message: 'Buổi học chưa bắt đầu hoặc đã kết thúc!' });
        }

        const startDatetime = new Date(sessionCheck.rows[0].start_datetime);
        const now = new Date();

        const graceMinutes = process.env.GRACE_PERIOD_MINUTES || 15;

        const allowedTime = new Date(startDatetime.getTime());
        allowedTime.setMinutes(allowedTime.getMinutes() + Number(graceMinutes));

        const calculatedStatus = now > allowedTime ? 'late' : 'present';

        // If the student has not checked in yet -> Insert new record (INSERT)
        // If the student has already checked in but the AI scans again -> Update to the latest timestamp (UPDATE)
        const result = await pool.query(
            `INSERT INTO Attendance (session_id, student_id, status, confidence_score) 
            VALUES ($1, $2, $3, $4) 
            ON CONFLICT (session_id, student_id) 
            DO UPDATE SET 
                check_in_time = CURRENT_TIMESTAMP, 
                status = EXCLUDED.status, 
                confidence_score = GREATEST(Attendance.confidence_score, EXCLUDED.confidence_score)
            RETURNING *`,
            [session_id, student_id, calculatedStatus, confidence_score]
        );
        res.status(200).json({
            message: calculatedStatus === 'late' ? 'Ghi nhận: Đi muộn!' : 'Ghi nhận: Có mặt',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi điểm danh' });
    }
};

// @desc    Lấy báo cáo điểm danh của 1 buổi học
// @route   GET /api/attendance/session/:session_id
// @access  Private
exports.getAttendanceBySession = async (req, res) => {
    const { session_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT a.*, s.student_code, s.name 
            FROM Attendance a
            JOIN Student s ON a.student_id = s.id
            WHERE a.session_id = $1
            ORDER BY a.check_in_time DESC`,
            [session_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi lấy báo cáo điểm danh' });
    }
};

// @desc    Giảng viên cập nhật trạng thái điểm danh thủ công (Duyệt đơn xin phép, sửa lỗi)
// @route   PUT /api/attendance/update-status
// @access  Private
exports.updateAttendanceStatus = async (req, res) => {
    const {session_id, student_id, new_status} = req.body;

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
            return res.status(200).json({message: 'Đã cập nhật trạng thái!', data: insertResult.rows[0]});
        }
        res.status(200).json({ message: 'Đã cập nhật trạng thái!', data: result.rows[0] });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái' });
    }
};