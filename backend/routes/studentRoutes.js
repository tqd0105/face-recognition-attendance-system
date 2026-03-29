const express = require('express');
const router = express.Router();
const {getStudents, createStudent} = require('../controllers/studentController');
const {protect} = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/')
    .get(getStudents)
    .post(createStudent);

module.exports = router;