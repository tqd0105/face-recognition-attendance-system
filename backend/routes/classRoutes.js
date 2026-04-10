const express = require('express');
const router = express.Router();
const { getClass, createClass, updateClass, deleteClass } = require('../controllers/classController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorizeRoles('teacher', 'admin'));

router.route('/')
    .get(getClass)
    .post(createClass);

router.put('/:id', updateClass);
router.delete('/:id', deleteClass);

module.exports = router;