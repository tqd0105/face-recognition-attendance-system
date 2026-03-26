const express = require('express');
const router = express.Router();
const {loginTeacher} = require('../controllers/authController');

router.post('/login', loginTeacher);

module.exports = router;