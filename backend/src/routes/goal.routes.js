const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goal.controller');
const { goalValidator } = require('../validators/goal.validator');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.route('/')
  .get(goalController.getGoals)
  .post(goalValidator, validate, goalController.createGoal);

router.get('/:id/guidance', goalController.getCareerGuidance);
router.get('/:id/guidance/summary', goalController.getGoalProgressSummary);
router.get('/:id/stages/:stageNumber/curriculum', goalController.getStageCurriculum);
router.post('/:id/stages/:stageNumber/topics/:topicId/toggle', goalController.toggleTopicCompletion);
router.post('/:id/stages/:stageNumber/reset', goalController.resetStageProgress);
router.post('/:id/stages/:stageNumber/topics/:topicId/assistant', goalController.askTopicAssistant);
router.post('/:id/progress/reset', goalController.resetGoalProgress);

router.route('/:id')
  .get(goalController.getGoalById)
  .put(goalValidator, validate, goalController.updateGoal)
  .delete(goalController.deleteGoal);

module.exports = router;
