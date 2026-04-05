const express = require('express');
const router = express.Router();
const { getStudents, createStudent, updateStudent, deleteStudent, restoreStudent, hardDeleteStudent } = require('../controllers/studentController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorizeRoles('teacher', 'admin'));

router.route('/')
    .get(getStudents)
    .post(createStudent);

router.route('/:id')
    .put(updateStudent)
    .delete(deleteStudent);

router.patch('/:id/restore', restoreStudent);
router.delete('/:id/permanent', authorizeRoles('admin'), hardDeleteStudent);

module.exports = router;