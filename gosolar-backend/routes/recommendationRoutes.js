const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/unread', authMiddleware, recommendationController.getUnreadRecommendations);
router.get('/type/:type', authMiddleware, recommendationController.getRecommendationsByType);
router.get('/system/:systemId', authMiddleware, recommendationController.getRecommendationsBySystem);
router.post('/generate/:systemId', authMiddleware, recommendationController.generateRecommendations);
router.patch('/read-all', authMiddleware, recommendationController.markAllAsRead);
router.delete('/old', authMiddleware, recommendationController.deleteOldRecommendations);
router.delete('/:id', authMiddleware, recommendationController.deleteRecommendation);
router.post('/auto/start/:systemId', authMiddleware, recommendationController.startAutoRecommendations);
router.post('/auto/stop/:systemId', authMiddleware, recommendationController.stopAutoRecommendations);
router.get('/', authMiddleware, recommendationController.getRecommendations);
router.get('/:id', authMiddleware, recommendationController.getRecommendationById);
router.patch('/:id/read', authMiddleware, recommendationController.markAsRead);

module.exports = router;