const commandCenter = require('../services/commandCenter.service');
const taskDecomposer = require('../services/taskDecomposer.service');
const habitCoach = require('../services/habitCoach.service');
const skillMastery = require('../services/skillMastery.service');
const whatIfSimulator = require('../services/whatIfSimulator.service');
const weeklyReview = require('../services/weeklyReview.service');
const universalAssistant = require('../services/universalAssistant.service');
const insightEngine = require('../services/insightEngine.service');

// 1. Command Center
exports.getDailyBriefing = async (req, res, next) => {
  try {
    const { date } = req.query;
    const briefing = await commandCenter.getDailyCommandBriefing(req.user.id, date);
    res.json({ success: true, data: briefing });
  } catch (err) {
    next(err);
  }
};

exports.optimizeDayPreview = async (req, res, next) => {
  try {
    const { date } = req.body;
    const preview = await commandCenter.optimizeMyDayPreview(req.user.id, date);
    res.json({ success: true, data: preview });
  } catch (err) {
    next(err);
  }
};

exports.applyOptimizedDay = async (req, res, next) => {
  try {
    const { date, proposed_items } = req.body;
    const result = await commandCenter.applyOptimizedSchedule(req.user.id, date, proposed_items);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// 2. Task Decomposer
exports.decomposeTask = async (req, res, next) => {
  try {
    const { task_id, custom_title } = req.body;
    const result = await taskDecomposer.decomposeTask(req.user.id, task_id, custom_title);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.saveSubtasks = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { subtasks } = req.body;
    const result = await taskDecomposer.saveApprovedSubtasks(req.user.id, taskId, subtasks);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

exports.getSubtasks = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const subtasks = await taskDecomposer.getSubtasks(req.user.id, taskId);
    res.json({ success: true, subtasks });
  } catch (err) {
    next(err);
  }
};

exports.toggleSubtask = async (req, res, next) => {
  try {
    const { subtaskId } = req.params;
    const { completed } = req.body;
    const result = await taskDecomposer.toggleSubtask(req.user.id, subtaskId, completed);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

exports.deleteSubtask = async (req, res, next) => {
  try {
    const { subtaskId } = req.params;
    const result = await taskDecomposer.deleteSubtask(req.user.id, subtaskId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

exports.scheduleSubtasks = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { subtask_ids, date } = req.body;
    const result = await taskDecomposer.scheduleSubtasksToPlanner(req.user.id, taskId, subtask_ids, date);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// 3. Habit Coach
exports.getHabitCoach = async (req, res, next) => {
  try {
    const { date } = req.query;
    const data = await habitCoach.getHabitCoachOverview(req.user.id, date);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.logHabitRecovery = async (req, res, next) => {
  try {
    const { habitId } = req.params;
    const { date, completed, notes } = req.body;
    const result = await habitCoach.logHabitWithRecovery(req.user.id, habitId, date, completed, notes);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// 4. Skill Mastery
exports.getMasteryDashboard = async (req, res, next) => {
  try {
    const data = await skillMastery.getSkillMasteryDashboard(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.generateQuiz = async (req, res, next) => {
  try {
    const { goal_id, stage_number, technology_id, topic_id, topic_title } = req.body;
    const quiz = await skillMastery.generateTopicQuiz(req.user.id, goal_id, stage_number, technology_id, topic_id, topic_title);
    res.json({ success: true, data: quiz });
  } catch (err) {
    next(err);
  }
};

exports.submitQuiz = async (req, res, next) => {
  try {
    const { goal_id, stage_number, technology_id, topic_id, questions, user_answers } = req.body;
    const result = await skillMastery.submitTopicQuiz(req.user.id, goal_id, stage_number, technology_id, topic_id, questions, user_answers);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.scheduleRevision = async (req, res, next) => {
  try {
    const { topic_id, topic_title, date } = req.body;
    const result = await skillMastery.scheduleTopicRevisionToPlanner(req.user.id, topic_id, topic_title, date);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// 5. What-If Simulator
exports.createScenario = async (req, res, next) => {
  try {
    const result = await whatIfSimulator.createSimulationScenario(req.user.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.listScenarios = async (req, res, next) => {
  try {
    const scenarios = await whatIfSimulator.listSimulationScenarios(req.user.id);
    res.json({ success: true, data: scenarios });
  } catch (err) {
    next(err);
  }
};

exports.applyScenario = async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const result = await whatIfSimulator.applySimulationScenario(req.user.id, scenarioId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// 6. Weekly Review
exports.getWeeklyReview = async (req, res, next) => {
  try {
    const { week_start } = req.query;
    const review = await weeklyReview.getWeeklyReview(req.user.id, week_start);
    res.json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
};

exports.applyNextWeek = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const result = await weeklyReview.applyNextWeekPlan(req.user.id, reviewId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// 7. Universal Assistant
exports.chatMessage = async (req, res, next) => {
  try {
    const result = await universalAssistant.handleAssistantMessage(req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.confirmAction = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { is_approved } = req.body;
    const result = await universalAssistant.confirmAssistantAction(req.user.id, chatId, is_approved);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

exports.getChatHistory = async (req, res, next) => {
  try {
    const { session_id } = req.query;
    const history = await universalAssistant.getAssistantChatHistory(req.user.id, session_id);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};

// 8. Insight Engine
exports.getInsights = async (req, res, next) => {
  try {
    const insights = await insightEngine.generateAndSyncInsights(req.user.id);
    res.json({ success: true, data: insights });
  } catch (err) {
    next(err);
  }
};

exports.updateInsight = async (req, res, next) => {
  try {
    const { insightId } = req.params;
    const result = await insightEngine.updateInsightStatus(req.user.id, insightId, req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};
