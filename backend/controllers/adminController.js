const pool = require('../config/db');

function buildTodayRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
}

// @desc    Admin dashboard overview metrics
// @route   GET /api/admin/overview
// @access  Private (admin)
exports.getOverview = async (_req, res) => {
    try {
        const { start, end } = buildTodayRange();

        const [
            teachers,
            students,
            homeClasses,
            courseClasses,
            sessionsByStatus,
            todayAttendance,
            totalAttendance,
        ] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS total FROM Teacher'),
            pool.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active, COUNT(*) FILTER (WHERE status <> 'active')::int AS inactive FROM Student"),
            pool.query('SELECT COUNT(*)::int AS total FROM Home_class'),
            pool.query('SELECT COUNT(*)::int AS total FROM Course_classes'),
            pool.query("SELECT status, COUNT(*)::int AS total FROM Session GROUP BY status"),
            pool.query('SELECT COUNT(*)::int AS total FROM Attendance WHERE check_in_time >= $1 AND check_in_time < $2', [start, end]),
            pool.query('SELECT COUNT(*)::int AS total FROM Attendance'),
        ]);

        const sessionSummary = {
            scheduled: 0,
            active: 0,
            completed: 0,
            canceled: 0,
        };

        sessionsByStatus.rows.forEach((row) => {
            const key = String(row.status || '').toLowerCase();
            if (Object.prototype.hasOwnProperty.call(sessionSummary, key)) {
                sessionSummary[key] = Number(row.total || 0);
            }
        });

        return res.status(200).json({
            message: 'Admin overview fetched',
            data: {
                teachers: Number(teachers.rows[0]?.total || 0),
                students: {
                    total: Number(students.rows[0]?.total || 0),
                    active: Number(students.rows[0]?.active || 0),
                    inactive: Number(students.rows[0]?.inactive || 0),
                },
                home_classes: Number(homeClasses.rows[0]?.total || 0),
                course_classes: Number(courseClasses.rows[0]?.total || 0),
                sessions: sessionSummary,
                attendance: {
                    today: Number(todayAttendance.rows[0]?.total || 0),
                    total: Number(totalAttendance.rows[0]?.total || 0),
                },
            },
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: 'Server error while fetching admin overview' });
    }
};

// @desc    Read current guardrail settings
// @route   GET /api/admin/guardrails
// @access  Private (admin)
exports.getGuardrails = async (_req, res) => {
    const toNumber = (value, fallback) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    return res.status(200).json({
        message: 'Guardrail settings fetched',
        data: {
            biometric_min_quality: toNumber(process.env.BIOMETRIC_MIN_QUALITY, 0.75),
            biometric_reenroll_min_similarity: toNumber(process.env.BIOMETRIC_REENROLL_MIN_SIMILARITY, 0.60),
            biometric_duplicate_similarity_threshold: toNumber(process.env.BIOMETRIC_DUPLICATE_SIMILARITY_THRESHOLD, 0.20),
            biometric_self_vs_other_margin: toNumber(process.env.BIOMETRIC_SELF_VS_OTHER_MARGIN, 0.03),
            biometric_strict_uniqueness: String(process.env.BIOMETRIC_STRICT_UNIQUENESS || 'true').toLowerCase() !== 'false',
            session_lifecycle_interval_ms: toNumber(process.env.SESSION_LIFECYCLE_INTERVAL_MS, 60000),
        },
    });
};
