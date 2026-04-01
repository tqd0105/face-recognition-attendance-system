const express = require('express');
const router = express.Router();
const {getCourseClasses, getCourseClassById, createCourseClass, enrollStudents, getEnrolledStudents} = require('../controllers/courseController');
const {protect} = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/')
    .get(getCourseClasses)
    .post(createCourseClass);

router.route('/:id')
    .get(getCourseClassById);

router.route('/:id/enroll')
    .post(enrollStudents);

router.route('/:id/students')
    .get(getEnrolledStudents);
module.exports = router;
