const express = require('express');
const router = express.Router();
const multer = require('multer');
const { checkEnrollment, enrollFace } = require('../controllers/biometricController');
const { protect } = require('../middlewares/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });
router.use(protect);
router.get('/student/:student_id', checkEnrollment);
router.post('/enroll', upload.single('image'), enrollFace);

module.exports = router;