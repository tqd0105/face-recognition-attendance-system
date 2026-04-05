const express = require('express');
const router = express.Router();
const { enrollStudent, getEnrolledStudents } = require('../controllers/enrollmentController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorizeRoles('teacher', 'admin'));

// Đường dẫn POST: /api/enrollments
router.route('/')
  .post(enrollStudent);

// Đường dẫn GET: /api/enrollments/:course_id
router.route('/:course_id')
  .get(getEnrolledStudents);

module.exports = router;