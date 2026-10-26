const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboardTools.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', controller.getTravelPlans);
router.post('/', controller.createTravelPlan);
router.delete('/:id', controller.deleteTravelPlan);

module.exports = router;
