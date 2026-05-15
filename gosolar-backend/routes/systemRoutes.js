const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/pair', authMiddleware, systemController.pairSystem);
router.post('/simulate/start', authMiddleware, systemController.startSimulation);
router.post('/simulate/run/:id', authMiddleware, systemController.runSimulation);
router.post('/simulate/stop/:id', authMiddleware, systemController.stopSimulation);

router.post('/pair/register', systemController.registerPairingCode);
router.get('/pair/status/:code', systemController.getPairingStatus);

router.post('/', authMiddleware, systemController.createSystem);
router.get('/', authMiddleware, systemController.getUserSystem);
router.get('/:id/dashboard', authMiddleware, systemController.getDashboardData);
router.get('/:id', authMiddleware, systemController.getSystemById);
router.put('/:id', authMiddleware, systemController.updateSystem);
router.delete('/:id', authMiddleware, systemController.deleteSystem);

module.exports = router;