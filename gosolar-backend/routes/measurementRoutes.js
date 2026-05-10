const express = require('express');
const router = express.Router();
const measurementController = require('../controllers/measurementController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', measurementController.addMeasurement);

router.get('/:systemId/latest', authMiddleware, measurementController.getLatestMeasurement);
router.get('/:systemId/history', authMiddleware, measurementController.getHistory);
router.get('/:systemId/history/period', authMiddleware, measurementController.getHistoryByPeriod);
router.get('/:systemId/summary', authMiddleware, measurementController.getSummary);
router.post('/:systemId/summary/generate', authMiddleware, measurementController.generateSummary);
router.get('/:systemId/daily', authMiddleware, measurementController.getDailyProduction);
router.get('/:systemId/monthly', authMiddleware, measurementController.getMonthlyProduction);
router.get('/:systemId/energy-vs-consumption', authMiddleware, measurementController.getEnergyVsConsumption);

module.exports = router;