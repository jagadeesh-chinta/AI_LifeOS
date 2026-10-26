import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 403 && error.response.data?.is_blocked) {
        window.dispatchEvent(new CustomEvent('account_blocked', { detail: error.response.data }));
      } else if (error.response.status === 401) {
        const url = error.config?.url || '';
        // Don't clear on login/register attempt failures
        if (!url.includes('/auth/login') && !url.includes('/auth/register') && !url.includes('/auth/change-password')) {
          localStorage.removeItem('token');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
