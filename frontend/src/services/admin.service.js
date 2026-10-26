import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const adminApi = axios.create({
  baseURL: `${API_BASE}/admin`
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getAdminStatus = async () => {
  const response = await adminApi.get('/status');
  return response.data;
};

export const registerInitialAdmin = async ({ username, email, password }) => {
  const response = await adminApi.post('/register', { username, email, password });
  return response.data;
};

export const loginAdmin = async ({ email, password }) => {
  const response = await adminApi.post('/login', { email, password });
  return response.data;
};

export const getAdminStats = async () => {
  const response = await adminApi.get('/stats');
  return response.data.stats;
};

export const getUsers = async ({
  page = 1,
  limit = 10,
  search = '',
  status = 'ALL',
  sortBy = 'created_at',
  sortOrder = 'DESC'
} = {}) => {
  const response = await adminApi.get('/users', {
    params: { page, limit, search, status, sortBy, sortOrder }
  });
  return response.data;
};

export const updateUserStatus = async (userId, status) => {
  const response = await adminApi.put(`/users/${userId}/status`, { status });
  return response.data;
};

// 1. Get user full profile for modal
export const getUserProfile = async (userId) => {
  const response = await adminApi.get(`/users/${userId}/profile`);
  return response.data;
};

// 2. Get user connections details
export const getUserConnections = async (userId) => {
  const response = await adminApi.get(`/users/${userId}/connections`);
  return response.data;
};

// 3. Block user account
export const blockUser = async (userId, { durationDays, reason }) => {
  const response = await adminApi.post(`/users/${userId}/block`, { durationDays, reason });
  return response.data;
};

// 4. Unblock user account
export const unblockUser = async (userId, { notes = '' } = {}) => {
  const response = await adminApi.post(`/users/${userId}/unblock`, { notes });
  return response.data;
};

// 5. Permanently delete user account
export const permanentlyDeleteUser = async (userId, confirmation = 'DELETE ACCOUNT') => {
  const response = await adminApi.delete(`/users/${userId}/permanent`, {
    data: { confirmation }
  });
  return response.data;
};

// 6. Help requests management (Admin)
export const getHelpRequests = async (params = {}) => {
  const response = await adminApi.get('/help-requests', { params });
  return response.data;
};

export const updateHelpRequest = async (id, { status, adminResponse }) => {
  const response = await adminApi.put(`/help-requests/${id}`, { status, adminResponse });
  return response.data;
};

// 7. Submit help request (User or Blocked User)
export const submitHelpRequest = async ({ message, email, username }) => {
  const response = await axios.post(`${API_BASE}/help-requests`, { message, email, username });
  return response.data;
};

export const adminService = {
  getAdminStatus,
  registerInitialAdmin,
  loginAdmin,
  getAdminStats,
  getUsers,
  updateUserStatus,
  getUserProfile,
  getUserConnections,
  blockUser,
  unblockUser,
  permanentlyDeleteUser,
  getHelpRequests,
  updateHelpRequest,
  submitHelpRequest
};

export default adminService;
