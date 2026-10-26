import api from './api';

export const discoverUsers = async (params = {}) => {
  const response = await api.get('/connections/discover', { params });
  return response.data;
};

export const getUserPublicProfile = async (userId) => {
  const response = await api.get(`/connections/profile/${userId}`);
  return response.data;
};

export const sendConnectionRequest = async (recipientId) => {
  const response = await api.post(`/connections/request/${recipientId}`);
  return response.data;
};

export const getRequests = async () => {
  const response = await api.get('/connections/requests');
  return response.data;
};

export const acceptRequest = async (connectionId) => {
  const response = await api.put(`/connections/accept/${connectionId}`);
  return response.data;
};

export const rejectRequest = async (connectionId) => {
  const response = await api.put(`/connections/reject/${connectionId}`);
  return response.data;
};

export const cancelOrDisconnect = async (connectionId) => {
  const response = await api.delete(`/connections/cancel/${connectionId}`);
  return response.data;
};

export const getAcceptedConnections = async () => {
  const response = await api.get('/connections/list');
  return response.data;
};

export const getMessages = async (partnerId) => {
  const response = await api.get(`/connections/messages/${partnerId}`);
  return response.data;
};

export const sendMessage = async (partnerId, content) => {
  const response = await api.post(`/connections/messages/${partnerId}`, { content });
  return response.data;
};
