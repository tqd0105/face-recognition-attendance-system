const express = require('express');
const router = express.Router();
const { checkIn, getAttendanceBySession } = require('../controllers/attendanceController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/check-in', checkIn);
router.get('/session/:session_id', getAttendanceBySession);

module.exports = router;