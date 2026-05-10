const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/generate', authMiddleware, reportController.generateReport);

module.exports = router;