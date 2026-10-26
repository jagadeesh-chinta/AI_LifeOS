import api from './api';

export const getCareerGuidance = async (goalId, forceRegenerate = false) => {
  const response = await api.get(`/goals/${goalId}/guidance`, {
    params: { regenerate: forceRegenerate ? 'true' : 'false' }
  });
  return response.data.roadmap;
};

export const getStageCurriculum = async (goalId, stageNumber) => {
  const response = await api.get(`/goals/${goalId}/stages/${stageNumber}/curriculum`);
  return response.data.curriculum;
};

export const toggleTopicCompletion = async (goalId, stageNumber, topicId, payload = {}) => {
  const response = await api.post(`/goals/${goalId}/stages/${stageNumber}/topics/${topicId}/toggle`, payload);
  return response.data;
};

export const resetStageProgress = async (goalId, stageNumber) => {
  const response = await api.post(`/goals/${goalId}/stages/${stageNumber}/reset`);
  return response.data;
};

export const resetGoalProgress = async (goalId) => {
  const response = await api.post(`/goals/${goalId}/progress/reset`);
  return response.data;
};

export const askTopicAssistant = async (goalId, stageNumber, topicContext, question) => {
  const response = await api.post(`/goals/${goalId}/stages/${stageNumber}/topics/${topicContext.id || 'topic'}/assistant`, {
    topicContext,
    question
  });
  return response.data;
};

export const getGoalProgressSummary = async (goalId) => {
  const response = await api.get(`/goals/${goalId}/guidance/summary`);
  return response.data.summary;
};
