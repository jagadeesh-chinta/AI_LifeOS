const goalService = require('../services/goal.service');

exports.createGoal = async (req, res, next) => {
  try {
    const goal = await goalService.createGoal(req.user.id, req.body);
    res.status(201).json({ success: true, goal });
  } catch (error) {
    next(error);
  }
};

exports.getGoals = async (req, res, next) => {
  try {
    const goals = await goalService.getGoals(req.user.id);
    res.status(200).json({ success: true, goals });
  } catch (error) {
    next(error);
  }
};

exports.getGoalById = async (req, res, next) => {
  try {
    const goal = await goalService.getGoalById(req.user.id, req.params.id);
    res.status(200).json({ success: true, goal });
  } catch (error) {
    next(error);
  }
};

exports.updateGoal = async (req, res, next) => {
  try {
    const goal = await goalService.updateGoal(req.user.id, req.params.id, req.body);
    res.status(200).json({ success: true, goal });
  } catch (error) {
    next(error);
  }
};

exports.deleteGoal = async (req, res, next) => {
  try {
    await goalService.deleteGoal(req.user.id, req.params.id);
    res.status(200).json({ success: true, message: 'Goal deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const careerService = require('../services/career.service');
const stageCurriculumService = require('../services/stageCurriculum.service');

exports.getCareerGuidance = async (req, res, next) => {
  try {
    const forceRegenerate = req.query.regenerate === 'true';
    const roadmap = await careerService.getCareerRoadmap(req.user.id, req.params.id, forceRegenerate);
    res.status(200).json({ success: true, roadmap });
  } catch (error) {
    next(error);
  }
};

exports.getStageCurriculum = async (req, res, next) => {
  try {
    const { id: goalId, stageNumber } = req.params;
    const curriculum = await stageCurriculumService.getStageCurriculum(req.user.id, goalId, stageNumber);
    res.status(200).json({ success: true, curriculum });
  } catch (error) {
    next(error);
  }
};

exports.toggleTopicCompletion = async (req, res, next) => {
  try {
    const { id: goalId, stageNumber, topicId } = req.params;
    const { technologyId, completed, notes } = req.body;
    const result = await stageCurriculumService.toggleTopicCompletion(
      req.user.id,
      goalId,
      stageNumber,
      technologyId || 'tech',
      topicId,
      completed,
      notes
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.resetStageProgress = async (req, res, next) => {
  try {
    const { id: goalId, stageNumber } = req.params;
    const result = await stageCurriculumService.resetStageProgress(req.user.id, goalId, stageNumber);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.resetGoalProgress = async (req, res, next) => {
  try {
    const { id: goalId } = req.params;
    const result = await stageCurriculumService.resetGoalProgress(req.user.id, goalId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.askTopicAssistant = async (req, res, next) => {
  try {
    const { id: goalId, stageNumber } = req.params;
    const { topicContext, question } = req.body;
    const result = await stageCurriculumService.askTopicAssistant(
      req.user.id,
      goalId,
      stageNumber,
      topicContext || {},
      question
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getGoalProgressSummary = async (req, res, next) => {
  try {
    const { id: goalId } = req.params;
    const summary = await stageCurriculumService.getGoalProgressSummary(req.user.id, goalId);
    res.status(200).json({ success: true, summary });
  } catch (error) {
    next(error);
  }
};
