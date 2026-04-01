const express = require('express');
const router = express.Router();
const { checkIn, getAttendanceBySession, updateAttendanceStatus, getAttendanceReport } = require('../controllers/attendanceController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/check-in', checkIn);
router.get('/session/:session_id', getAttendanceBySession);
router.put('/update-status', updateAttendanceStatus);
router.get('/report/:class_id', getAttendanceReport);

module.exports = router;