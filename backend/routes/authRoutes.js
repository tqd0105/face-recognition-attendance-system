const express = require('express');
const router = express.Router();
const {loginTeacher, getMe} = require('../controllers/authController');
const {protect} = require('../middlewares/authMiddleware');

router.post('/login', loginTeacher);

router.get('/me', protect, getMe);

module.exports = router;