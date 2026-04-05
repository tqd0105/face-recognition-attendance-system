const express = require('express');
const router = express.Router();
const { getSessions, createSession, updateSession, startSession, stopSession, cancelSession, deleteSession } = require('../controllers/sessionController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorizeRoles('teacher', 'admin'));

router.route('/')
	.get(getSessions)
	.post(createSession);

router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

router.patch('/:id/start', startSession);
router.patch('/:id/stop', stopSession);
router.patch('/:id/cancel', cancelSession);

module.exports = router;