import api from './api';

// Saved Timetables CRUD
export const getSavedTimetables = async (type = null) => {
  const params = type ? { type } : {};
  const response = await api.get('/timetable/saved', { params });
  return response.data.timetables;
};

export const getSavedTimetable = async (id) => {
  const response = await api.get(`/timetable/saved/${id}`);
  return response.data.timetable;
};

export const createSavedTimetable = async (payload) => {
  const response = await api.post('/timetable/saved', payload);
  return response.data.timetable;
};

export const updateSavedTimetable = async (id, payload) => {
  const response = await api.put(`/timetable/saved/${id}`, payload);
  return response.data.timetable;
};

export const duplicateSavedTimetable = async (id) => {
  const response = await api.post(`/timetable/saved/${id}/duplicate`);
  return response.data.timetable;
};

export const deleteSavedTimetable = async (id) => {
  const response = await api.delete(`/timetable/saved/${id}`);
  return response.data;
};

// Generators & Validators
export const generateAIStudyTimetable = async (payload) => {
  const response = await api.post('/timetable/ai-study/generate', payload);
  return response.data.data;
};

export const generateFacultyTimetable = async (payload) => {
  const response = await api.post('/timetable/faculty/generate', payload);
  return response.data.data;
};

export const validateTimetableConflicts = async (activities) => {
  const response = await api.post('/timetable/validate', { activities });
  return response.data;
};

// Legacy compatibility
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
