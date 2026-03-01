import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export type Theme =
  | 'light'
  | 'dark'
  | 'system'
  | 'abyss'
  | 'vscode-dark-plus'
  | 'discord-graphite'
  | 'nord'
  | 'tokyo-night'
  | 'catppuccin-mocha'
  | 'one-dark-pro'
  | 'dracula'
  | 'gruvbox-dark'
  | 'solarized-dark'
  | 'synthwave';

type ResolvedTheme = Exclude<Theme, 'system'>;

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const THEME_CLASS_MAP: Record<ResolvedTheme, string | null> = {
  light: null,
  dark: 'dark',
  abyss: 'abyss',
  'vscode-dark-plus': 'theme-vscode-dark-plus',
  'discord-graphite': 'theme-discord-graphite',
  nord: 'theme-nord',
  'tokyo-night': 'theme-tokyo-night',
  'catppuccin-mocha': 'theme-catppuccin-mocha',
  'one-dark-pro': 'theme-one-dark-pro',
  dracula: 'theme-dracula',
  'gruvbox-dark': 'theme-gruvbox-dark',
  'solarized-dark': 'theme-solarized-dark',
  synthwave: 'theme-synthwave',
};

const ALL_THEME_CLASSES = Object.values(THEME_CLASS_MAP).filter(Boolean) as string[];

function applyResolvedThemeToRoot(resolvedTheme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove(...ALL_THEME_CLASSES);

  // Keep Tailwind dark: variants active for all non-light themes.
  if (resolvedTheme !== 'light') {
    root.classList.add('dark');
  }

  const className = THEME_CLASS_MAP[resolvedTheme];
  if (className && className !== 'dark') {
    root.classList.add(className);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth();

  const [theme, setThemeState] = useState<Theme>(() => {
    if (user?.themePreference) {
      return user.themePreference as Theme;
    }
    const stored = localStorage.getItem('themePreference');
    return (stored as Theme) || 'system';
  });

  const getResolvedTheme = useCallback((currentTheme: Theme): ResolvedTheme => {
    if (currentTheme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return currentTheme;
  }, []);

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => getResolvedTheme(theme));

  useEffect(() => {
    const resolved = getResolvedTheme(theme);
    setResolvedTheme(resolved);
    applyResolvedThemeToRoot(resolved);
  }, [theme, getResolvedTheme]);

  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const resolved = getResolvedTheme('system');
      setResolvedTheme(resolved);
      applyResolvedThemeToRoot(resolved);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [theme, getResolvedTheme]);

  useEffect(() => {
    if (!user?.themePreference) return;

    setThemeState((prevTheme) => {
      if (prevTheme === user.themePreference) return prevTheme;
      localStorage.setItem('themePreference', user.themePreference);
      return user.themePreference as Theme;
    });
  }, [user?.themePreference]);

  const setTheme = useCallback(
    async (newTheme: Theme) => {
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

        if (typeof document !== 'undefined' && (document as any).startViewTransition) {
          (document as any).startViewTransition(() => {
            setThemeState(newTheme);
            localStorage.setItem('themePreference', newTheme);
          });
        } else {
          setThemeState(newTheme);
          localStorage.setItem('themePreference', newTheme);
        }

        await refreshUser();
      } catch (error) {
        console.error('Failed to update theme preference:', error);
        setThemeState(newTheme);
        localStorage.setItem('themePreference', newTheme);
        throw error;
      }
    },
    [refreshUser]
  );

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
