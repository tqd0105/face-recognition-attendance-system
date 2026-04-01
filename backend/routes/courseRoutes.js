const express = require('express');
const router = express.Router();
const {getCourseClasses, getCourseClassById, createCourseClass} = require('../controllers/courseController');
const {protect} = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/')
    .get(getCourseClasses)
    .post(createCourseClass);

router.route('/:id')
    .get(getCourseClassById);

module.exports = router;
