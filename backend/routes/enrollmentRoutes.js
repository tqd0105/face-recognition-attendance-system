const express = require('express');
const router = express.Router();
const {enrollStudent, getEnrolledStudents} = require('../controllers/enrollmentController');
const {protect} = require('../middlewares/authMiddleware');

router.use(protect);

// Đường dẫn POST: /api/enrollments
router.route('/')
  .post(enrollStudent);

// Đường dẫn GET: /api/enrollments/:course_id
router.route('/:course_id')
  .get(getEnrolledStudents);

module.exports = router;