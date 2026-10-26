import api from './api';

// Get local date string formatted as YYYY-MM-DD
export const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDashboardStats = async (date) => {
  const queryDate = date || getLocalDateString();
  const response = await api.get(`/dashboard/stats?date=${queryDate}`);
  return response.data.stats;
};

export const getDashboardTimeline = async (date) => {
  const queryDate = date || getLocalDateString();
  const response = await api.get(`/dashboard/timeline?date=${queryDate}`);
  return response.data.timeline;
};

export const getDashboardRecommendations = async (date) => {
  const queryDate = date || getLocalDateString();
  const response = await api.get(`/dashboard/recommendations?date=${queryDate}`);
  return response.data.recommendations;
};

export const trackTimeUsage = async (secondsToAdd, date) => {
  const queryDate = date || getLocalDateString();
  const response = await api.post('/dashboard/track-time', {
    date: queryDate,
    secondsToAdd
  });
  return response.data.secondsTracked;
};

export const checkLoginStreak = async (date) => {
  const queryDate = date || getLocalDateString();
  const response = await api.post('/dashboard/streak/check', {
    date: queryDate
  });
  return response.data.currentStreak;
};
