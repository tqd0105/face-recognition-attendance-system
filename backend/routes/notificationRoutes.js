const express = require('express');
const router = express.Router();
const { getNotifications, resendAbsentNotifications } = require('../controllers/notificationController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorizeRoles('teacher', 'admin'));

router.get('/', getNotifications);
router.post('/resend-absent', resendAbsentNotifications);

module.exports = router;
