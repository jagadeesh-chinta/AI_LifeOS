const express = require('express');
const router = express.Router();
const controller = require('../controllers/ecosystem.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// 1. Daily Command Center
router.get('/briefing', controller.getDailyBriefing);
router.post('/optimize-day/preview', controller.optimizeDayPreview);
router.post('/optimize-day/apply', controller.applyOptimizedDay);

// 2. Task Decomposer
router.post('/tasks/decompose', controller.decomposeTask);
router.get('/tasks/:taskId/subtasks', controller.getSubtasks);
router.post('/tasks/:taskId/subtasks', controller.saveSubtasks);
router.put('/subtasks/:subtaskId/toggle', controller.toggleSubtask);
router.delete('/subtasks/:subtaskId', controller.deleteSubtask);
router.post('/tasks/:taskId/schedule-subtasks', controller.scheduleSubtasks);

// 3. Habit Coach
router.get('/habits/coach', controller.getHabitCoach);
router.post('/habits/:habitId/log-recovery', controller.logHabitRecovery);

// 4. Skill Mastery Engine
router.get('/mastery/dashboard', controller.getMasteryDashboard);
router.post('/mastery/quiz/generate', controller.generateQuiz);
router.post('/mastery/quiz/submit', controller.submitQuiz);
router.post('/mastery/schedule-revision', controller.scheduleRevision);

// 5. What-If Life Simulator
router.get('/simulator/scenarios', controller.listScenarios);
router.post('/simulator/scenarios', controller.createScenario);
router.post('/simulator/scenarios/:scenarioId/apply', controller.applyScenario);

// 6. Weekly Life Review
router.get('/review/weekly', controller.getWeeklyReview);
router.post('/review/weekly/:reviewId/apply-next-week', controller.applyNextWeek);

// 7. Universal AI Assistant
router.post('/assistant/chat', controller.chatMessage);
router.post('/assistant/actions/:chatId/confirm', controller.confirmAction);
router.get('/assistant/history', controller.getChatHistory);

// 8. Cross-Module Insight Engine
router.get('/insights', controller.getInsights);
router.put('/insights/:insightId', controller.updateInsight);

module.exports = router;
