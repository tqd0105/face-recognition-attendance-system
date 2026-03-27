const express = require('express');
const router = express.Router();
const {getClass, createClass} = require('../controllers/classController');
const {protect} = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/')
    .get(getClass)
    .post(createClass);

module.exports = router;