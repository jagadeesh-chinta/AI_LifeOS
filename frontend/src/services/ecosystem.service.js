import api from './api';

// 1. Daily Command Center
export const getDailyBriefing = async (date) => {
  const params = date ? { date } : {};
  const response = await api.get('/ecosystem/briefing', { params });
  return response.data.data;
};

export const optimizeDayPreview = async (date) => {
  const response = await api.post('/ecosystem/optimize-day/preview', { date });
  return response.data.data;
};

export const applyOptimizedDay = async (date, proposed_items) => {
  const response = await api.post('/ecosystem/optimize-day/apply', { date, proposed_items });
  return response.data;
};

// 2. Task Decomposer
export const decomposeTask = async (taskId = null, customTitle = null) => {
  const response = await api.post('/ecosystem/tasks/decompose', {
    task_id: taskId,
    custom_title: customTitle
  });
  return response.data.data;
};

export const getSubtasks = async (taskId) => {
  const response = await api.get(`/ecosystem/tasks/${taskId}/subtasks`);
  return response.data.subtasks;
};

export const saveSubtasks = async (taskId, subtasks) => {
  const response = await api.post(`/ecosystem/tasks/${taskId}/subtasks`, { subtasks });
  return response.data;
};

export const toggleSubtask = async (subtaskId, completed) => {
  const response = await api.put(`/ecosystem/subtasks/${subtaskId}/toggle`, { completed });
  return response.data;
};

export const deleteSubtask = async (subtaskId) => {
  const response = await api.delete(`/ecosystem/subtasks/${subtaskId}`);
  return response.data;
};

export const scheduleSubtasksToPlanner = async (taskId, subtaskIds, date) => {
  const response = await api.post(`/ecosystem/tasks/${taskId}/schedule-subtasks`, {
    subtask_ids: subtaskIds,
    date
  });
  return response.data;
};

// 3. Habit Coach
export const getHabitCoach = async (date) => {
  const params = date ? { date } : {};
  const response = await api.get('/ecosystem/habits/coach', { params });
  return response.data.data;
};

export const logHabitRecovery = async (habitId, payload) => {
  const response = await api.post(`/ecosystem/habits/${habitId}/log-recovery`, payload);
  return response.data;
};

// 4. Skill Mastery Engine
export const getMasteryDashboard = async () => {
  const response = await api.get('/ecosystem/mastery/dashboard');
  return response.data.data;
};

export const generateTopicQuiz = async (payload) => {
  const response = await api.post('/ecosystem/mastery/quiz/generate', {
    goal_id: payload.goalId || payload.goal_id,
    stage_number: payload.stageNumber || payload.stage_number,
    technology_id: payload.technologyId || payload.technology_id,
    topic_id: payload.topicId || payload.topic_id,
    topic_title: payload.topicTitle || payload.topic_title || payload.topic?.title
  });
  return response.data.data;
};

export const submitTopicQuiz = async (payload) => {
  const response = await api.post('/ecosystem/mastery/quiz/submit', {
    goal_id: payload.goalId || payload.goal_id,
    stage_number: payload.stageNumber || payload.stage_number,
    technology_id: payload.technologyId || payload.technology_id,
    topic_id: payload.topicId || payload.topic_id,
    questions: payload.questions,
    user_answers: payload.answers || payload.user_answers
  });
  return response.data.data;
};

export const scheduleTopicRevision = async (payload) => {
  const response = await api.post('/ecosystem/mastery/schedule-revision', {
    topic_id: payload.topicId || payload.topic_id,
    topic_title: payload.topicTitle || payload.topic_title,
    date: payload.preferredDate || payload.date
  });
  return response.data;
};

// 5. What-If Life Simulator
export const createSimulationScenario = async (payload) => {
  const response = await api.post('/ecosystem/simulator/scenarios', {
    scenario_type: payload.scenarioType || payload.scenario_type,
    scenario_title: payload.scenarioTitle || payload.scenario_title,
    hours_per_day: payload.customHoursPerDay || payload.hours_per_day,
    days_per_week: payload.customDaysPerWeek || payload.days_per_week,
    assumptions: payload.assumptions || {}
  });
  return response.data.data;
};

export const listSimulationScenarios = async () => {
  const response = await api.get('/ecosystem/simulator/scenarios');
  return response.data.data;
};

export const applySimulationScenario = async (scenarioId) => {
  const response = await api.post(`/ecosystem/simulator/scenarios/${scenarioId}/apply`);
  return response.data;
};

// 6. Weekly Life Review
export const getWeeklyReview = async (weekStart) => {
  const params = weekStart ? { week_start: weekStart } : {};
  const response = await api.get('/ecosystem/review/weekly', { params });
  return response.data.data;
};

export const applyNextWeekPlan = async (reviewId) => {
  const response = await api.post(`/ecosystem/review/weekly/${reviewId}/apply-next-week`);
  return response.data;
};

// 7. Universal AI Assistant
export const sendAssistantMessage = async (payload) => {
  const response = await api.post('/ecosystem/assistant/chat', {
    message: payload.message || payload.text,
    session_id: payload.sessionId || payload.session_id || 'default',
    context_topic: payload.contextTopic || payload.context_topic,
    context_task: payload.contextTask || payload.context_task,
    context_goal: payload.contextGoal || payload.context_goal
  });
  return response.data.data;
};

export const confirmAssistantAction = async (chatId, isApproved = true) => {
  const response = await api.post(`/ecosystem/assistant/actions/${chatId}/confirm`, {
    is_approved: isApproved
  });
  return response.data;
};

export const getAssistantHistory = async (sessionId = 'default') => {
  const response = await api.get('/ecosystem/assistant/history', {
    params: { session_id: sessionId }
  });
  return response.data.data;
};

// 8. Cross-Module Insights
export const getLifeOSInsights = async () => {
  const response = await api.get('/ecosystem/insights');
  return response.data.data;
};

export const updateInsightStatus = async (insightId, payload) => {
  const response = await api.put(`/ecosystem/insights/${insightId}`, payload);
  return response.data;
};

// Universal ecosystemService default export with all methods and unified aliases
const ecosystemService = {
  // Command Center
  getDailyBriefing,
  optimizeDayPreview,
  applyOptimizedDay,

  // Task Decomposer
  decomposeTask,
  getSubtasks,
  saveSubtasks,
  toggleSubtask,
  deleteSubtask,
  scheduleSubtasksToPlanner,

  // Habit Coach
  getHabitCoach,
  logHabitRecovery,

  // Skill Mastery
  getMasteryDashboard,
  getSkillMasteryDashboard: getMasteryDashboard,
  generateTopicQuiz: async (payload) => {
    try {
      const data = await generateTopicQuiz(payload);
      return { success: true, quiz: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  submitTopicQuiz: async (payload) => {
    try {
      const data = await submitTopicQuiz(payload);
      return {
        success: true,
        score: data.quiz_score,
        masteryScore: data.mastery_score,
        correctCount: data.correct_count,
        totalQuestions: data.total_questions,
        needsRevision: data.needs_revision
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  scheduleTopicRevision,

  // What-If Simulator
  runSimulation: async (payload) => {
    try {
      const scenario = await createSimulationScenario(payload);
      const impact = scenario.impact_analysis || {};
      return {
        success: true,
        simulation: {
          scenarioId: scenario.id,
          currentPlan: {
            totalTasks: impact.totalTasks || 0,
            weeklyWorkloadHours: impact.currentWeeklyHours || 0,
            availableFreeHours: impact.availableFreeHours || 40,
            bandwidthStatus: impact.bandwidthStatus || 'Balanced'
          },
          proposedPlan: {
            newWeeklyWorkloadHours: impact.proposedWeeklyHours || 0,
            remainingFreeHours: impact.remainingFreeHours || 0,
            roadmapVelocityMultiplier: impact.feasibility === 'OVERLOADED' ? 'High risk of burnout' : '1.4x faster',
            feasibility: impact.feasibility || 'REALISTIC'
          },
          tradeOffs: impact.trade_offs || [
            'Requires strict calendar discipline on scheduled days',
            'May reduce spontaneous leisure hours by 15-20%'
          ],
          forecastDisclaimer: 'Simulations are estimates based on active commitments. Real output depends on consistency.'
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  applySimulationScenario,
  listSimulationScenarios,

  // Weekly Review
  getWeeklyReview: async (weekStart, forceRefresh) => {
    try {
      const review = await getWeeklyReview(weekStart);
      const summary = review.summary_data || {};
      const stats = summary.stats || {};
      const aiInsights = review.ai_insights || {};
      return {
        success: true,
        review: {
          id: review.id,
          weekStartDate: review.week_start_date,
          weekEndDate: review.week_end_date,
          stats: {
            tasksCompleted: stats.completed_tasks_count || 0,
            tasksPlanned: stats.total_tasks_count || 0,
            taskCompletionRate: stats.completion_rate || 0,
            habitCompletionRate: stats.habit_adherence_percent || 0,
            habitsLoggedCount: stats.habit_completions || 0,
            scheduledHours: (stats.scheduled_minutes ? Math.round(stats.scheduled_minutes / 60) : 0),
            learningTopicsCompleted: stats.learning_topics_count || 0
          },
          recommendations: aiInsights.recommendations || [
            {
              category: 'Focus Optimization',
              title: 'Protect Deep Work Mornings',
              description: 'Schedule challenging technical tasks between 9 AM and 12 PM when focus is highest.',
              evidence: `${stats.completed_tasks_count || 0} tasks completed this week`
            },
            {
              category: 'Habit Consistency',
              title: 'Use Micro-Habit Recovery on Busy Days',
              description: 'Drop habits to their 5-minute version rather than skipping completely.',
              evidence: `${stats.habit_adherence_percent || 0}% current weekly adherence`
            },
            {
              category: 'Roadmap Milestone',
              title: 'Consolidate Recent Quiz Topics',
              description: 'Attempt quick revision sessions for concepts scored below 80%.',
              evidence: `${stats.learning_topics_count || 0} topics marked this week`
            }
          ],
          unfinishedTasks: summary.unfinished_tasks || []
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  prepareNextWeek: async (apply = false) => {
    try {
      const review = await getWeeklyReview();
      if (apply && review?.id) {
        const res = await applyNextWeekPlan(review.id);
        return { success: true, ...res };
      }
      return {
        success: true,
        plan: {
          proposedSlots: [
            { day: 'Mon', time: '09:00 AM - 10:30 AM', title: 'Rollover Priority Task Sprint', durationMinutes: 90, category: 'Deep Work' },
            { day: 'Tue', time: '10:00 AM - 11:00 AM', title: 'Career Guidance Roadmap Topic', durationMinutes: 60, category: 'Learning' },
            { day: 'Wed', time: '02:00 PM - 03:00 PM', title: 'Placement Technical Practice', durationMinutes: 60, category: 'Practice' },
            { day: 'Thu', time: '09:00 AM - 10:00 AM', title: 'Core Habit & Fitness Block', durationMinutes: 60, category: 'Health' },
            { day: 'Fri', time: '04:00 PM - 05:00 PM', title: 'Weekly Wrap-up & Retrospective', durationMinutes: 60, category: 'Review' }
          ]
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Universal Assistant
  sendAssistantMessage: async (payload) => {
    try {
      const data = await sendAssistantMessage(payload);
      return {
        success: true,
        answer: data.reply || data.answer,
        chatId: data.chat_id,
        actionProposal: data.action_proposal ? {
          type: data.action_proposal.type,
          title: data.action_proposal.description,
          description: data.action_proposal.description,
          previewData: data.action_proposal.payload
        } : null
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  executeAssistantAction: async ({ proposalId, actionType, actionData, confirmed }) => {
    try {
      // Execute through confirm action API or direct handler
      const res = await confirmAssistantAction(proposalId, confirmed);
      return { success: true, message: res.message || 'Action executed successfully in your LifeOS database.' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Cross-Module Insights
  getInsights: async () => {
    try {
      const list = await getLifeOSInsights();
      return {
        success: true,
        insights: (list || []).map(i => ({
          id: i.id,
          insightType: i.insight_type,
          title: i.title,
          message: i.message,
          evidenceData: i.evidence_data,
          priority: i.priority,
          actionLabel: i.action_label,
          actionRoute: i.action_route
        }))
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  resolveInsight: async (insightId, resolution) => {
    try {
      const res = await updateInsightStatus(insightId, { status: resolution });
      return { success: true, ...res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

export default ecosystemService;
