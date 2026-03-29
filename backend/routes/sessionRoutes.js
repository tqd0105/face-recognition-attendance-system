const express = require('express');
const router = express.Router();
const { getSessionsByCourse, createSession } = require('../controllers/sessionController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

// POST: Tạo buổi học mới
router.route('/')
  .post(createSession);

// GET: Lấy danh sách buổi học theo course_id
router.route('/:course_id')
  .get(getSessionsByCourse);

module.exports = router;