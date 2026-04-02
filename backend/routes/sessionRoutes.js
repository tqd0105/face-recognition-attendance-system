const express = require('express');
const router = express.Router();
const { getSessions, createSession, startSession, stopSession } = require('../controllers/sessionController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/')
	.get(getSessions)
	.post(createSession);

router.patch('/:id/start', startSession);
router.patch('/:id/stop', stopSession);

module.exports = router;