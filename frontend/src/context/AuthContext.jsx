import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { disconnectSocket } from '../services/socket';
import BlockedAccountView from '../components/common/BlockedAccountView';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blockedInfo, setBlockedInfo] = useState(null);

  useEffect(() => {
    const handleAccountBlocked = (e) => {
      if (e.detail?.is_blocked) {
        setBlockedInfo(e.detail);
      }
    };
    window.addEventListener('account_blocked', handleAccountBlocked);
    return () => window.removeEventListener('account_blocked', handleAccountBlocked);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          if (data.user?.account_status === 'TEMPORARILY_BLOCKED') {
            setBlockedInfo({
              is_blocked: true,
              block_reason: data.user.block_reason,
              blocked_until: data.user.blocked_until,
              username: data.user.name,
              email: data.user.email
            });
          } else {
            setUser(data.user);
            setBlockedInfo(null);
          }
        } catch (error) {
          if (error.response?.data?.is_blocked) {
            setBlockedInfo(error.response.data);
          } else {
            localStorage.removeItem('token');
          }
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const { data } = await api.get('/auth/me');
        if (data.user?.account_status === 'TEMPORARILY_BLOCKED') {
          setBlockedInfo({
            is_blocked: true,
            block_reason: data.user.block_reason,
            blocked_until: data.user.blocked_until,
            username: data.user.name,
            email: data.user.email
          });
        } else {
          setUser(data.user);
          setBlockedInfo(null);
        }
        return data.user;
      } catch (error) {
        if (error.response?.data?.is_blocked) {
          setBlockedInfo(error.response.data);
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
    }
    return null;
  };

  const login = async (email, password) => {
    const clientDate = getLocalDateString();
    try {
      const { data } = await api.post('/auth/login', { email, password, clientDate });
      localStorage.setItem('token', data.token);
      if (data.user?.account_status === 'TEMPORARILY_BLOCKED') {
        setBlockedInfo({
          is_blocked: true,
          block_reason: data.user.block_reason,
          blocked_until: data.user.blocked_until,
          username: data.user.name,
          email: data.user.email
        });
      } else {
        setUser(data.user);
        setBlockedInfo(null);
      }
    } catch (err) {
      if (err.response?.data?.is_blocked) {
        setBlockedInfo(err.response.data);
      }
      throw err;
    }
  };

  const register = async (name, email, password) => {
    const clientDate = getLocalDateString();
    const { data } = await api.post('/auth/register', { name, email, password, clientDate });
    localStorage.setItem('token', data.token);
    setUser(data.user);
  };

  const updateProfile = async (name, email) => {
    const { data } = await api.put('/auth/profile', { name, email });
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    const { data } = await api.put('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword
    });
    return data;
  };

  const getUserStats = async () => {
    const { data } = await api.get('/auth/stats');
    return data.stats;
  };

  const uploadProfilePhoto = async (formData) => {
    const { data } = await api.post('/auth/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    if (data.avatar) {
      setUser((prev) => (prev ? { ...prev, avatar: data.avatar } : prev));
    }
    return data;
  };

  const completeTour = async () => {
    try {
      const { data } = await api.put('/auth/tour-complete');
      setUser((prev) => (prev ? { ...prev, tour_completed: true } : prev));
      return data;
    } catch (err) {
      console.error('Failed to complete tour:', err);
    }
  };

  const logout = () => {
    try {
      disconnectSocket();
    } catch {}
    localStorage.removeItem('token');
    sessionStorage.clear();
    setUser(null);
  };

  const deleteAccount = async (password, confirmation) => {
    const { data } = await api.delete('/auth/account', {
      data: { password, confirmation }
    });
    try {
      disconnectSocket();
    } catch {}
    localStorage.removeItem('token');
    sessionStorage.clear();
    setUser(null);
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      blockedInfo,
      setBlockedInfo,
      login,
      register,
      logout,
      deleteAccount,
      refreshUser,
      updateProfile,
      uploadProfilePhoto,
      completeTour,
      changePassword,
      getUserStats,
      loading
    }}>
      {!loading && (
        <>
          {children}
          {blockedInfo && (
            <BlockedAccountView
              blockedInfo={blockedInfo}
              onLogout={() => {
                logout();
                setBlockedInfo(null);
              }}
            />
          )}
        </>
      )}
    </AuthContext.Provider>
  );
};
