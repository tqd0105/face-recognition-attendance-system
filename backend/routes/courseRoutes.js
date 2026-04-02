const express = require('express');
const router = express.Router();
const { getCourseClasses, getCourseClassById, createCourseClass, updateCourseClass, enrollStudents, getEnrolledStudents, deleteCourseClass } = require('../controllers/courseController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/')
    .get(getCourseClasses)
    .post(createCourseClass);

router.route('/:id')
    .get(getCourseClassById)
    .put(updateCourseClass)
    .delete(deleteCourseClass);

router.route('/:id/enroll')
    .post(enrollStudents);

router.route('/:id/students')
    .get(getEnrolledStudents);
module.exports = router;
