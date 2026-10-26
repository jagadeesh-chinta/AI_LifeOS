import api from './api';

export const getSchedule = async (date) => {
  const response = await api.get(`/schedules/${date}`);
  return response.data.schedule;
};

export const saveSchedule = async (data) => {
  const response = await api.post('/schedules', data);
  return response.data.schedule;
};

export const updateScheduleItem = async (itemId, data) => {
  const response = await api.put(`/schedules/items/${itemId}`, data);
  return response.data;
};

export const generateSchedule = async (date) => {
  const response = await api.post('/ai/generate-schedule', { date });
  return response.data;
};

export const parseNaturalLanguage = async (text) => {
  const response = await api.post('/ai/parse', { text });
  return response.data;
};

export const deleteSchedule = async (date) => {
  const response = await api.delete(`/schedules/${date}`);
  return response.data;
};

// Interactive Slot Chat and Controls
export const getSlotChat = async (itemId) => {
  const response = await api.get(`/schedules/items/${itemId}/chat`);
  return response.data;
};

export const sendSlotMessage = async (itemId, message) => {
  const response = await api.post(`/schedules/items/${itemId}/chat`, { message });
  return response.data;
};

export const updateSlotPlan = async (itemId, actionPlan) => {
  const response = await api.put(`/schedules/items/${itemId}/plan`, { action_plan: actionPlan });
  return response.data;
};

export const adjustSlotTiming = async (itemId, data) => {
  const response = await api.post(`/schedules/items/${itemId}/timing`, data);
  return response.data;
};

export const splitSlot = async (itemId, data) => {
  const response = await api.post(`/schedules/items/${itemId}/split`, data);
  return response.data;
};
