import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    // Initialize from user preference if available, otherwise from localStorage, otherwise 'system'
    if (user?.themePreference) {
      return user.themePreference as Theme;
    }
    const stored = localStorage.getItem('themePreference');
    return (stored as Theme) || 'system';
  });

  // Get resolved theme (light or dark) based on theme preference
  const getResolvedTheme = useCallback((currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      // Check system preference
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return currentTheme;
  }, []);

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    getResolvedTheme(theme)
  );

  // Apply theme to document
  useEffect(() => {
    const resolved = getResolvedTheme(theme);
    setResolvedTheme(resolved);

    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, getResolvedTheme]);

  // Listen for system theme changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const resolved = getResolvedTheme('system');
      setResolvedTheme(resolved);
      const root = document.documentElement;
      if (resolved === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme, getResolvedTheme]);

  // Sync theme with user preference when user changes
  useEffect(() => {
    if (user?.themePreference && user.themePreference !== theme) {
      setThemeState(user.themePreference as Theme);
      localStorage.setItem('themePreference', user.themePreference);
    }
  }, [user?.themePreference]);

  // Update theme preference
  const setTheme = useCallback(async (newTheme: Theme) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/auth/theme`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ themePreference: newTheme }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update theme preference');
      }

      // Update local state with view transition if possible
      if (typeof document !== 'undefined' && (document as any).startViewTransition) {
        (document as any).startViewTransition(() => {
          setThemeState(newTheme);
          localStorage.setItem('themePreference', newTheme);
        });
      } else {
        setThemeState(newTheme);
        localStorage.setItem('themePreference', newTheme);
      }

      // Refresh user data to get updated theme preference
      await refreshUser();
    } catch (error) {
      console.error('Failed to update theme preference:', error);
      // Still update local state for immediate feedback
      setThemeState(newTheme);
      localStorage.setItem('themePreference', newTheme);
      throw error;
    }
  }, [refreshUser]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
