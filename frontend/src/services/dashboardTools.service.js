import api from './api';

// Travel
export const getTravelPlans = async () => {
  const response = await api.get('/travel');
  return response.data.plans;
};

export const createTravelPlan = async (data) => {
  const response = await api.post('/travel', data);
  return response.data.plan;
};

export const deleteTravelPlan = async (id) => {
  const response = await api.delete(`/travel/${id}`);
  return response.data;
};

// Timetable
export const getTimetables = async (day = 'ALL') => {
  const response = await api.get('/timetable', { params: { day } });
  return response.data.entries;
};

export const createTimetableEntry = async (data) => {
  const response = await api.post('/timetable', data);
  return response.data;
};

export const deleteTimetableEntry = async (id) => {
  const response = await api.delete(`/timetable/${id}`);
  return response.data;
};

// Budget
export const getBudgetSummary = async (period = 'Monthly') => {
  const response = await api.get('/budget/summary', { params: { period } });
  return response.data;
};

export const createBudgetEntry = async (data) => {
  const response = await api.post('/budget/entry', data);
  return response.data.entry;
};

export const deleteBudgetEntry = async (id) => {
  const response = await api.delete(`/budget/entry/${id}`);
  return response.data;
};
