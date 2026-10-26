const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { eventValidator, eventUpdateValidator } = require('../validators/event.validator');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.route('/')
  .get(eventController.getEvents)
  .post(eventValidator, validate, eventController.createEvent);

router.route('/:id')
  .get(eventController.getEventById)
  .put(eventUpdateValidator, validate, eventController.updateEvent)
  .delete(eventController.deleteEvent);

module.exports = router;
