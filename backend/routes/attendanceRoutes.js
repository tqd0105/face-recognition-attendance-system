const express = require('express');
const router = express.Router();
const {
    checkIn,
    recognizeRealtime,
    checkInOneFace,
    getAttendanceBySession,
    updateAttendanceStatus,
    getAttendanceReport,
    getStudentAttendanceHistory,
    getMyAttendanceHistory,
    manualCheckIn,
    updateAttendanceById
} = require('../controllers/attendanceController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/check-in', authorizeRoles('teacher', 'admin'), checkIn);
router.post('/check-in-one-face', authorizeRoles('teacher', 'admin'), checkInOneFace);
router.post('/recognize', authorizeRoles('teacher', 'admin'), recognizeRealtime);
router.post('/manual', authorizeRoles('teacher', 'admin'), manualCheckIn)

router.get('/session/:session_id', getAttendanceBySession);
router.get('/student/:student_id', getStudentAttendanceHistory);
router.get('/me', authorizeRoles('student'), getMyAttendanceHistory);
router.get('/report/:course_class_id', getAttendanceReport);

router.put('/update-status', authorizeRoles('teacher', 'admin'), updateAttendanceStatus);
router.put('/:id', authorizeRoles('teacher', 'admin'), updateAttendanceById);
module.exports = router;