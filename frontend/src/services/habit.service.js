import api from './api';

export const getHabits = async () => {
  const response = await api.get('/habits');
  return response.data.habits;
};

export const createHabit = async (data) => {
  const response = await api.post('/habits', data);
  return response.data.habit;
};

export const updateHabit = async (id, data) => {
  const response = await api.put(`/habits/${id}`, data);
  return response.data.habit;
};

export const deleteHabit = async (id) => {
  const response = await api.delete(`/habits/${id}`);
  return response.data;
};

export const logHabit = async (id, data) => {
  const response = await api.post(`/habits/${id}/log`, data);
  return response.data;
};
