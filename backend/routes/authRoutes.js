const express = require('express');
const router = express.Router();
const { loginTeacher, getMe, changeStudentPassword } = require('../controllers/authController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { getOverview, getGuardrails } = require('../controllers/adminController');

router.post('/login', loginTeacher);

router.get('/me', protect, getMe);
router.patch('/student/change-password', protect, authorizeRoles('student'), changeStudentPassword);
router.get('/admin/overview', protect, authorizeRoles('admin'), getOverview);
router.get('/admin/guardrails', protect, authorizeRoles('admin'), getGuardrails);

module.exports = router;