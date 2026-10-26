import api from './api';

export const getEvents = async () => {
  const response = await api.get('/events');
  return response.data.events;
};

export const createEvent = async (data) => {
  const response = await api.post('/events', data);
  return response.data.event;
};

export const updateEvent = async (id, data) => {
  const response = await api.put(`/events/${id}`, data);
  return response.data.event;
};

export const deleteEvent = async (id) => {
  const response = await api.delete(`/events/${id}`);
  return response.data;
};
