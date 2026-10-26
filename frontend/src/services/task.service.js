import api from './api';

export const getTasks = async (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  const response = await api.get(`/tasks?${query}`);
  return response.data.tasks;
};

export const createTask = async (data) => {
  const response = await api.post('/tasks', data);
  return response.data.task;
};

export const updateTask = async (id, data) => {
  const response = await api.put(`/tasks/${id}`, data);
  return response.data.task;
};

export const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`);
  return response.data;
};
