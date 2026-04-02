const express = require('express');
const router = express.Router();
const { getSessions, createSession, updateSession, startSession, stopSession, deleteSession } = require('../controllers/sessionController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/')
	.get(getSessions)
	.post(createSession);

router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

router.patch('/:id/start', startSession);
router.patch('/:id/stop', stopSession);

module.exports = router;