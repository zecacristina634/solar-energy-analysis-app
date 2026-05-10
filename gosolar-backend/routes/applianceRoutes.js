const express = require('express');
const router = express.Router();
const applianceController = require('../controllers/applianceController');
const authMiddleware = require('../middleware/authMiddleware');
const { route } = require('./systemRoutes');

router.get('/catalog/categories', applianceController.getCategories);
router.get('/catalog', applianceController.getCatalog);
router.get('/catalog/:id', applianceController.getCatalogById);

router.get('/constant', authMiddleware, applianceController.getConstantAppliances);
router.post('/constant', authMiddleware, applianceController.addConstantAppliance);
router.put('/constant/:id', authMiddleware, applianceController.updateConstantAppliance);
router.delete('/constant/:id', authMiddleware, applianceController.deleteConstantAppliance);

router.get('/shiftable', authMiddleware, applianceController.getShiftableLoads);
router.post('/shiftable', authMiddleware, applianceController.addShiftableLoad);
router.put('/shiftable/:id', authMiddleware, applianceController.updateShiftableLoad);
router.delete('/shiftable/:id', authMiddleware, applianceController.deleteShiftableLoad);

module.exports = router;