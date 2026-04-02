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
    manualCheckIn,
    updateAttendanceById
} = require('../controllers/attendanceController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/check-in', checkIn);
router.post('/check-in-one-face', checkInOneFace);
router.post('/recognize', recognizeRealtime);
router.post('/manual', manualCheckIn)

router.get('/session/:session_id', getAttendanceBySession);
router.get('/student/:student_id', getStudentAttendanceHistory);
router.get('/report/:course_class_id', getAttendanceReport);

router.put('/update-status', updateAttendanceStatus);
router.put('/:id', updateAttendanceById);
module.exports = router;