const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    checkEnrollment,
    getEnrollmentHistory,
    deleteEnrollmentHistoryByStudent,
    deleteEnrollmentById,
    enrollFace,
} = require('../controllers/biometricController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });
router.use(protect);
router.use(authorizeRoles('teacher', 'admin'));
router.get('/student/:student_id', checkEnrollment);
router.get('/student/:student_id/history', getEnrollmentHistory);
router.delete('/student/:student_id', authorizeRoles('admin'), deleteEnrollmentHistoryByStudent);
router.delete('/enrollment/:enrollment_id', authorizeRoles('admin'), deleteEnrollmentById);
router.post('/enroll', upload.single('image'), enrollFace);

module.exports = router;