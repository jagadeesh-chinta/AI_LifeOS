const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/stats', dashboardController.getStats);
router.get('/timeline', dashboardController.getTimeline);
router.get('/recommendations', dashboardController.getRecommendations);
router.post('/track-time', dashboardController.trackTime);
router.post('/streak/check', dashboardController.checkStreak);

module.exports = router;
