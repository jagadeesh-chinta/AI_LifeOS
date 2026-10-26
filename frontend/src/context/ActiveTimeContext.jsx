import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getDashboardStats, trackTimeUsage, getLocalDateString } from '../services/dashboard.service';

const ActiveTimeContext = createContext();

export const formatTimeTracked = (totalSeconds) => {
  if (!totalSeconds || totalSeconds < 60) {
    const mins = Math.floor(totalSeconds / 60) || 0;
    return `${mins}m`;
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

export const ActiveTimeProvider = ({ children }) => {
  const { user } = useAuth();
  const [liveSeconds, setLiveSeconds] = useState(0);
  const pendingSecondsRef = useRef(0);
  const lastActiveTimestampRef = useRef(Date.now());
  const isSyncingRef = useRef(false);

  // Initialize today's tracked seconds from backend when user logs in
  useEffect(() => {
    if (!user) {
      setLiveSeconds(0);
      return;
    }

    let isMounted = true;
    const fetchInitialStats = async () => {
      try {
        const today = getLocalDateString();
        const stats = await getDashboardStats(today);
        if (isMounted && stats && typeof stats.secondsTracked === 'number') {
          setLiveSeconds(stats.secondsTracked);
        }
      } catch (err) {
        console.error('Failed to load initial active time:', err);
      }
    };

    fetchInitialStats();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Global activity tracking across the ENTIRE application
  useEffect(() => {
    if (!user) return;

    const today = getLocalDateString();

    const handleUserActivity = () => {
      lastActiveTimestampRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('click', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });

    // Flush pending seconds to backend
    const flushPending = async () => {
      if (pendingSecondsRef.current <= 0 || isSyncingRef.current) return;
      const secondsToSync = pendingSecondsRef.current;
      pendingSecondsRef.current = 0;
      isSyncingRef.current = true;
      try {
        await trackTimeUsage(secondsToSync, today);
      } catch (err) {
        console.error('Error syncing tracked time:', err);
        pendingSecondsRef.current += secondsToSync;
      } finally {
        isSyncingRef.current = false;
      }
    };

    // 1-second interval to tick active seconds
    const secondTimer = setInterval(() => {
      const now = Date.now();
      const isRecentlyActive = now - lastActiveTimestampRef.current < 60000; // Active in last 60s
      const isVisible = document.visibilityState === 'visible';

      if (isVisible && isRecentlyActive) {
        setLiveSeconds(prev => prev + 1);
        pendingSecondsRef.current += 1;
      }
    }, 1000);

    // 10-second batch sync to backend
    const syncTimer = setInterval(() => {
      if (pendingSecondsRef.current >= 10) {
        flushPending();
      }
    }, 10000);

    // Flush when user switches tab or minimizes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPending();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Flush on page unload/close
    const handleBeforeUnload = () => {
      if (pendingSecondsRef.current > 0) {
        const payload = JSON.stringify({
          date: today,
          secondsToAdd: pendingSecondsRef.current
        });
        const token = localStorage.getItem('token');
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(`http://localhost:5000/api/dashboard/track-time?token=${token}`, blob);
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(secondTimer);
      clearInterval(syncTimer);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushPending();
    };
  }, [user]);

  return (
    <ActiveTimeContext.Provider value={{ liveSeconds, setLiveSeconds, formatTimeTracked }}>
      {children}
    </ActiveTimeContext.Provider>
  );
};

export const useActiveTime = () => {
  const context = useContext(ActiveTimeContext);
  if (!context) {
    throw new Error('useActiveTime must be used within an ActiveTimeProvider');
  }
  return context;
};
