import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AccessLevel, PermissionsMap } from '@/types/rbac';

export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  roleId?: string | null;
  isActive: boolean;
  themePreference?: 'light' | 'dark' | 'system';
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  permissions: PermissionsMap;
  canAccess: (resourceKey: string) => AccessLevel;
  canView: (resourceKey: string) => boolean;
  canEdit: (resourceKey: string) => boolean;
  canDelete: (resourceKey: string) => boolean;
  canManage: (resourceKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('authToken');
  });
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const canAccess = useCallback(
    (resourceKey: string): AccessLevel => {
      // Admin users have full access to everything
      if (isAdmin) {
        return 'full';
      }
      return permissions[resourceKey] ?? 'none';
    },
    [permissions, isAdmin]
  );
  const canView = useCallback(
    (resourceKey: string) => {
      // Admin users can view everything
      if (isAdmin) {
        return true;
      }
      return (permissions[resourceKey] ?? 'none') !== 'none';
    },
    [permissions, isAdmin]
  );
  const canEdit = useCallback(
    (resourceKey: string) => {
      // Admin users can edit everything
      if (isAdmin) {
        return true;
      }
      const level = permissions[resourceKey] ?? 'none';
      return level === 'edit' || level === 'full';
    },
    [permissions, isAdmin]
  );
  const canDelete = useCallback(
    (resourceKey: string) => {
      // Admin users can delete everything
      if (isAdmin) {
        return true;
      }
      return (permissions[resourceKey] ?? 'none') === 'full';
    },
    [permissions, isAdmin]
  );
  const canManage = canDelete; // Alias for backward compatibility

  // Fetch current user
  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setPermissions(data.permissions ?? {});
      } else {
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
        setPermissions({});
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
      setPermissions({});
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Check authentication on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Login function
  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    setPermissions(data.permissions ?? {});
    localStorage.setItem('authToken', data.token);
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
      setPermissions({});
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshUser,
        isAdmin,
        isManager,
        permissions,
        canAccess,
        canView,
        canEdit,
        canDelete,
        canManage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

