const express = require('express');
const router = express.Router();
const {getCourses, createCourse} = require('../controllers/courseController');
const {protect} = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/')
    .get(getCourses)
    .post(createCourse);

module.exports = router;
