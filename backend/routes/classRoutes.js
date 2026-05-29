const express = require('express');
const router = express.Router();
const { getClass, createClass, updateClass, deleteClass } = require('../controllers/classController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', authorizeRoles('teacher', 'admin'), getClass);
router.post('/', authorizeRoles('admin'), createClass);
router.put('/:id', authorizeRoles('admin'), updateClass);
router.delete('/:id', authorizeRoles('admin'), deleteClass);

module.exports = router;