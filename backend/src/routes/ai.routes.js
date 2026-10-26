const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/generate-schedule', aiController.generateSchedule);
router.post('/generate', aiController.generateSchedule);
router.post('/parse', aiController.parseText);

module.exports = router;
