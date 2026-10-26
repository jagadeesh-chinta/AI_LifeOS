import api from './api';

export const getNotes = async (search = '') => {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await api.get(`/notes${query}`);
  return response.data.notes;
};

export const createNote = async (data) => {
  const response = await api.post('/notes', data);
  return response.data.note;
};

export const updateNote = async (id, data) => {
  const response = await api.put(`/notes/${id}`, data);
  return response.data.note;
};

export const deleteNote = async (id) => {
  const response = await api.delete(`/notes/${id}`);
  return response.data;
};
