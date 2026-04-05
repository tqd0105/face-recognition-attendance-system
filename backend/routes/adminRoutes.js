const express = require('express');
const router = express.Router();
const { getOverview, getGuardrails } = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/overview', getOverview);
router.get('/guardrails', getGuardrails);

module.exports = router;
