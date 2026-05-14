const express = require('express');
const router = express.Router();
const forecastController = require('../controllers/forecastController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/fetch/:systemId', authMiddleware, forecastController.fetchForecast);
router.get('/:systemId', authMiddleware, forecastController.getWeeklyForecast);
router.get('/:systemId/:date', authMiddleware, forecastController.getForecastByDate);
router.delete('/:systemId/past', authMiddleware, forecastController.deletePastForecasts);

module.exports = router;