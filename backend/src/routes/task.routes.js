const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { taskValidator, updateTaskValidator } = require('../validators/task.validator');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.route('/')
  .get(taskController.getTasks)
  .post(taskValidator, validate, taskController.createTask);

router.route('/:id')
  .get(taskController.getTaskById)
  .put(updateTaskValidator, validate, taskController.updateTask)
  .delete(taskController.deleteTask);

module.exports = router;
