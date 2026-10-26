import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { updatePreferences } from '../services/preference.service';

const THEME_STORAGE_KEY = 'ailifeos_theme';

const ThemeContext = createContext({
  theme: 'system',
  effectiveTheme: 'dark',
  setTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
  // Read stored preference immediately to avoid mismatch
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && ['light', 'dark', 'system'].includes(stored.toLowerCase())) {
        return stored.toLowerCase();
      }
    } catch (e) {
      console.warn('Could not read theme from localStorage', e);
    }
    return 'system';
  });

  // Track system preference
  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true; // Default fallback
  });

  // Calculate effective theme: 'light' or 'dark'
  const effectiveTheme = useMemo(() => {
    if (theme === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return theme;
  }, [theme, systemIsDark]);

  // Synchronize document classes and attributes whenever effectiveTheme changes
  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  }, [effectiveTheme]);

  // Listen to OS preference changes only when theme is 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Update current system state
    setSystemIsDark(mediaQuery.matches);

    // Only attach listener if current theme preference is 'system'
    if (theme === 'system') {
      const handleChange = (e) => {
        setSystemIsDark(e.matches);
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.addListener) {
        // Fallback for older browsers
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [theme]);

  // Set theme preference function
  const setTheme = useCallback(async (newTheme) => {
    const normalized = (newTheme || 'system').toLowerCase();
    if (!['light', 'dark', 'system'].includes(normalized)) return;

    setThemeState(normalized);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch (e) {
      console.warn('Failed to save theme in localStorage', e);
    }

    // Attempt to persist to backend user preferences asynchronously without blocking UI
    try {
      await updatePreferences({ theme: normalized });
    } catch (err) {
      // Backend may fail if unauthenticated or offline, which is fine as localStorage is active
    }
  }, []);

  const value = useMemo(() => ({
    theme,
    effectiveTheme,
    setTheme
  }), [theme, effectiveTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
