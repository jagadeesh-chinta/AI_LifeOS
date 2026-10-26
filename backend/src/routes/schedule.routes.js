const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/:date', scheduleController.getSchedule);
router.post('/', scheduleController.saveSchedule);
router.put('/items/:itemId', scheduleController.updateScheduleItem);
router.delete('/:date', scheduleController.deleteSchedule);

// Interactive Schedule Slot routes
router.get('/items/:itemId/chat', scheduleController.getSlotChat);
router.post('/items/:itemId/chat', scheduleController.sendSlotChatMessage);
router.put('/items/:itemId/plan', scheduleController.updateSlotPlan);
router.post('/items/:itemId/timing', scheduleController.adjustSlotTiming);
router.post('/items/:itemId/split', scheduleController.splitSlot);

module.exports = router;

