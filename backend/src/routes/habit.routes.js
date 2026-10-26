const express = require('express');
const router = express.Router();
const habitController = require('../controllers/habit.controller');
const { habitValidator, logValidator } = require('../validators/habit.validator');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.route('/')
  .get(habitController.getHabits)
  .post(habitValidator, validate, habitController.createHabit);

router.route('/:id')
  .get(habitController.getHabitById)
  .put(habitValidator, validate, habitController.updateHabit)
  .delete(habitController.deleteHabit);

router.post('/:id/log', logValidator, validate, habitController.logHabit);

module.exports = router;
