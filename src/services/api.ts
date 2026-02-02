import { LeadRecord } from '@/types/record';
import { TelecallerLeadRecord, TelecallerTrashRecord } from '@/types/telecaller';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
console.log('API_BASE_URL:', API_BASE_URL);

// Helper to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Helper to handle auth errors
const handleAuthError = (response: Response) => {
  if (response.status === 401) {
    // Clear token and redirect to login
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
};

import type { AccessLevel, Resource, Role, PermissionsMap } from '@/types/rbac';

// User type for API
export interface UserRecord {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  roleId?: string | null;
  departmentId?: string | { _id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Department type for API
export interface Department {
  _id: string;
  name: string;
  description?: string;
  head?: { _id: string; name: string; email: string } | null;
  isActive: boolean;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Auth API
export const authAPI = {
  // Login (returns user, token, permissions)
  login: async (
    email: string,
    password: string
  ): Promise<{ token: string; user: UserRecord; permissions: PermissionsMap }> => {
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
    return response.json();
  },

  // Logout
  logout: async (): Promise<void> => {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
  },

  // Get current user (includes permissions)
  getCurrentUser: async (): Promise<{ user: UserRecord; permissions: PermissionsMap }> => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to get current user');
    }
    return response.json();
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to change password');
    }
  },

  // Update theme preference
  updateThemePreference: async (themePreference: 'light' | 'dark' | 'system'): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/theme`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ themePreference }),
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update theme preference');
    }
  },
};

// RBAC API
export const rbacAPI = {
  getResources: async (): Promise<Resource[]> => {
    const response = await fetch(`${API_BASE_URL}/rbac/resources`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch resources');
    }
    return response.json();
  },

  getMyPermissions: async (): Promise<{ permissions: PermissionsMap }> => {
    const response = await fetch(`${API_BASE_URL}/rbac/me/permissions`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch permissions');
    }
    return response.json();
  },

  getRoles: async (): Promise<Role[]> => {
    const response = await fetch(`${API_BASE_URL}/rbac/roles`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch roles');
    }
    return response.json();
  },

  getRoleById: async (id: string): Promise<Role> => {
    const response = await fetch(`${API_BASE_URL}/rbac/roles/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch role');
    }
    return response.json();
  },

  createRole: async (data: {
    name: string;
    description?: string;
    permissions: { resourceKey: string; accessLevel: AccessLevel }[];
    isSystem?: boolean;
  }): Promise<Role> => {
    const response = await fetch(`${API_BASE_URL}/rbac/roles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create role');
    }
    return response.json();
  },

  updateRole: async (
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: { resourceKey: string; accessLevel: AccessLevel }[];
      isSystem?: boolean;
    }
  ): Promise<Role> => {
    const response = await fetch(`${API_BASE_URL}/rbac/roles/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update role');
    }
    return response.json();
  },

  deleteRole: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/rbac/roles/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete role');
    }
  },
};

// Users API (permission: manage_users)
export const usersAPI = {
  // Get all users
  getAll: async (): Promise<UserRecord[]> => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch users');
    }
    return response.json();
  },

  // Get a single user
  getById: async (id: string): Promise<UserRecord> => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user');
    }
    return response.json();
  },

  // Create a new user (role or roleId)
  create: async (
    data: { email: string; password: string; name: string; role?: string; roleId?: string | null; departmentId?: string | null }
  ): Promise<UserRecord> => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }
    return response.json();
  },

  // Update a user (role or roleId)
  update: async (
    id: string,
    data: Partial<{ email: string; name: string; role: string; roleId: string | null; departmentId: string | null; isActive: boolean; password: string }>
  ): Promise<UserRecord> => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user');
    }
    return response.json();
  },

  // Delete a user
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete user');
    }
  },

  // Change user role (pass role string or roleId)
  changeRole: async (
    id: string,
    payload: { role?: string; roleId?: string }
  ): Promise<UserRecord> => {
    const response = await fetch(`${API_BASE_URL}/users/${id}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to change user role');
    }
    return response.json();
  },
};

// Departments API
export const departmentsAPI = {
  // Get all departments
  getAll: async (): Promise<Department[]> => {
    const response = await fetch(`${API_BASE_URL}/departments`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch departments');
    }
    return response.json();
  },

  // Get a single department with members
  getById: async (id: string): Promise<Department & { members: UserRecord[] }> => {
    const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch department');
    }
    return response.json();
  },

  // Create a new department
  create: async (data: { name: string; description?: string; head?: string | null; isActive?: boolean }): Promise<Department> => {
    const response = await fetch(`${API_BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to create department');
    }
    return response.json();
  },

  // Update a department
  update: async (id: string, data: Partial<{ name: string; description: string; head: string | null; isActive: boolean }>): Promise<Department> => {
    const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to update department');
    }
    return response.json();
  },

  // Delete a department
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete department');
    }
  },

  // Get members of a department
  getMembers: async (id: string): Promise<UserRecord[]> => {
    const response = await fetch(`${API_BASE_URL}/departments/${id}/members`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch department members');
    }
    return response.json();
  },

  // Add user to department
  addMember: async (departmentId: string, userId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/departments/${departmentId}/members`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to add user to department');
    }
  },

  // Remove user from department
  removeMember: async (departmentId: string, userId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/departments/${departmentId}/members/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove user from department');
    }
  },
};

// Sources API
export const sourcesAPI = {
  // Get all sources
  getAll: async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE_URL}/sources`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch sources');
    }
    return response.json();
  },

  // Update all sources (bulk operation)
  updateAll: async (sources: string[]): Promise<string[]> => {
    const response = await fetch(`${API_BASE_URL}/sources/bulk`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sources }),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to update sources');
    }
    return response.json();
  },

  // Create a new source
  create: async (name: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/sources`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to create source');
    }
    return response.json();
  },

  // Delete a source
  delete: async (name: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/sources/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete source');
    }
  },
};

// Identities API
export const identitiesAPI = {
  // Get all identities
  getAll: async (): Promise<LeadRecord[]> => {
    const response = await fetch(`${API_BASE_URL}/identities`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      let errorMessage = 'Failed to fetch identities';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        const text = await response.text();
        errorMessage = `Server error: ${response.status} ${response.statusText}. Make sure the backend server is running on port 3001.`;
        console.error('Non-JSON response:', text.substring(0, 200));
      }
      throw new Error(errorMessage);
    }
    const data = await response.json();
    // Map MongoDB documents to LeadRecord format
    return data.map((item: any) => ({
      _id: item._id,
      id: item._id, // Use _id as id for backward compatibility
      uniqueId: item.uniqueId,
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      interests: item.interests || [],
      source: item.source,
      remarks: item.remarks || '',
      dateAdded: item.dateAdded,
    }));
  },

  // Get a single identity by ID
  getById: async (id: string): Promise<LeadRecord> => {
    const response = await fetch(`${API_BASE_URL}/identities/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch identity');
    }
    const item = await response.json();
    return {
      _id: item._id,
      id: item._id,
      uniqueId: item.uniqueId,
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      interests: item.interests || [],
      source: item.source,
      remarks: item.remarks || '',
      dateAdded: item.dateAdded,
    };
  },

  // Bulk create identities
  createBulk: async (entries: Omit<LeadRecord, '_id' | 'id' | 'uniqueId' | 'dateAdded'>[]): Promise<{
    message: string;
    success: number;
    failed: number;
    results: {
      success: LeadRecord[];
      failed: Array<{
        index: number;
        error: string;
        data: any;
      }>;
    };
  }> => {
    const response = await fetch(`${API_BASE_URL}/identities/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ entries }),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      let errorMessage = 'Failed to create identities';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        const text = await response.text();
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error('Non-JSON response:', text.substring(0, 200));
      }
      throw new Error(errorMessage);
    }
    const result = await response.json();
    // Map successful identities to LeadRecord format
    return {
      ...result,
      results: {
        ...result.results,
        success: result.results.success.map((item: any) => ({
          _id: item._id,
          id: item._id,
          uniqueId: item.uniqueId,
          name: item.name,
          email: item.email || '',
          phone: item.phone || '',
          interests: item.interests || [],
          source: item.source,
          remarks: item.remarks || '',
          dateAdded: item.dateAdded,
        })),
      },
    };
  },

  // Create a new identity
  create: async (data: Omit<LeadRecord, '_id' | 'id' | 'uniqueId'>): Promise<LeadRecord> => {
    const response = await fetch(`${API_BASE_URL}/identities`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      let errorMessage = 'Failed to create identity';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        // If response is not JSON (e.g., HTML error page)
        const text = await response.text();
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error('Non-JSON response:', text.substring(0, 200));
      }
      throw new Error(errorMessage);
    }
    const item = await response.json();
    return {
      _id: item._id,
      id: item._id,
      uniqueId: item.uniqueId,
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      interests: item.interests || [],
      source: item.source,
      remarks: item.remarks || '',
      dateAdded: item.dateAdded,
    };
  },

  // Update an identity
  update: async (id: string, data: Omit<LeadRecord, '_id' | 'id' | 'uniqueId'>): Promise<LeadRecord> => {
    const response = await fetch(`${API_BASE_URL}/identities/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      let errorMessage = 'Failed to update identity';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        const text = await response.text();
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error('Non-JSON response:', text.substring(0, 200));
      }
      throw new Error(errorMessage);
    }
    const item = await response.json();
    return {
      _id: item._id,
      id: item._id,
      uniqueId: item.uniqueId,
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      interests: item.interests || [],
      source: item.source,
      remarks: item.remarks || '',
      dateAdded: item.dateAdded,
    };
  },

  // Delete an identity
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/identities/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      let errorMessage = 'Failed to delete identity';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        const text = await response.text();
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error('Non-JSON response:', text.substring(0, 200));
      }
      throw new Error(errorMessage);
    }
  },
};

// Trash API
export const trashAPI = {
  // Get all trash records
  getAll: async (): Promise<LeadRecord[]> => {
    const response = await fetch(`${API_BASE_URL}/trash`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      let errorMessage = 'Failed to fetch trash records';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        const text = await response.text();
        errorMessage = `Server error: ${response.status} ${response.statusText}. Make sure the backend server is running on port 3001.`;
        console.error('Non-JSON response:', text.substring(0, 200));
      }
      throw new Error(errorMessage);
    }
    const data = await response.json();
    return data.map((item: any) => ({
      _id: item._id,
      id: item._id,
      uniqueId: item.uniqueId,
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      interests: item.interests || [],
      source: item.source,
      remarks: item.remarks || '',
      dateAdded: item.dateAdded,
    }));
  },

  // Add a record to trash
  add: async (record: LeadRecord): Promise<LeadRecord> => {
    const response = await fetch(`${API_BASE_URL}/trash`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(record),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      let errorMessage = 'Failed to add record to trash';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        const text = await response.text();
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error('Non-JSON response:', text.substring(0, 200));
      }
      throw new Error(errorMessage);
    }
    const item = await response.json();
    return {
      _id: item._id,
      id: item._id,
      uniqueId: item.uniqueId,
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      interests: item.interests || [],
      source: item.source,
      remarks: item.remarks || '',
      dateAdded: item.dateAdded,
    };
  },

  // Restore a record from trash (move it back to identities)
  restore: async (id: string): Promise<LeadRecord> => {
    const response = await fetch(`${API_BASE_URL}/trash/${id}/restore`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      let errorMessage = 'Failed to restore record';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        const text = await response.text();
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error('Non-JSON response:', text.substring(0, 200));
      }
      throw new Error(errorMessage);
    }
    const item = await response.json();
    return {
      _id: item._id,
      id: item._id,
      uniqueId: item.uniqueId,
      name: item.name,
      email: item.email || '',
      phone: item.phone || '',
      interests: item.interests || [],
      source: item.source,
      remarks: item.remarks || '',
      dateAdded: item.dateAdded,
    };
  },

  // Permanently delete a record from trash
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/trash/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      let errorMessage = 'Failed to permanently delete record';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        const text = await response.text();
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error('Non-JSON response:', text.substring(0, 200));
      }
      throw new Error(errorMessage);
    }
  },

  // Empty trash (delete all records)
  empty: async (): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/trash`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      let errorMessage = 'Failed to empty trash';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        const text = await response.text();
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error('Non-JSON response:', text.substring(0, 200));
      }
      throw new Error(errorMessage);
    }
  },
};

// Log types
export interface LogRecord {
  _id: string;
  action: string;
  userId: string;
  userName: string;
  userEmail: string;
  details: Record<string, any>;
  formattedDetails: string;
  timestamp: string;
  createdAt: string;
}

export interface LogsResponse {
  logs: LogRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LogAction {
  value: string;
  label: string;
}

export interface LogUser {
  _id: string;
  name: string;
  email: string;
}

// Logs API (admin only)
export const logsAPI = {
  // Get all logs with filtering and pagination
  getAll: async (params?: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<LogsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.action) queryParams.append('action', params.action);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.search) queryParams.append('search', params.search);

    const url = `${API_BASE_URL}/logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      let errorMessage = 'Failed to fetch logs';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        const text = await response.text();
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error('Non-JSON response:', text.substring(0, 200));
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  // Get list of users for filtering
  getUsers: async (): Promise<LogUser[]> => {
    const response = await fetch(`${API_BASE_URL}/logs/users`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch users for logs');
    }
    return response.json();
  },

  // Get list of action types
  getActions: async (): Promise<LogAction[]> => {
    const response = await fetch(`${API_BASE_URL}/logs/actions`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch action types');
    }
    return response.json();
  },

  // Get auth logs (login/logout) with filtering
  getAuthLogs: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    action?: 'user_login' | 'user_logout';
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<LogsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    // Filter for auth actions only
    queryParams.append('action', params?.action || 'user_login,user_logout');
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.search) queryParams.append('search', params.search);

    const url = `${API_BASE_URL}/logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      let errorMessage = 'Failed to fetch auth logs';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        const text = await response.text();
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error('Non-JSON response:', text.substring(0, 200));
      }
      throw new Error(errorMessage);
    }
    const data = await response.json();

    // Filter by deviceType if specified
    if (params?.deviceType && data.logs) {
      data.logs = data.logs.filter((log: any) =>
        log.deviceType === params.deviceType ||
        log.details?.deviceType === params.deviceType
      );
      // Recalculate pagination after filtering
      data.pagination.total = data.logs.length;
      data.pagination.totalPages = Math.ceil(data.logs.length / (params.limit || 50));
    }

    return data;
  },
};

// Tour Categories API
export interface TourCategoryRecord {
  _id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  packageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const tourCategoriesAPI = {
  // Get all categories
  getAll: async (): Promise<TourCategoryRecord[]> => {
    const response = await fetch(`${API_BASE_URL}/tour-categories`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch tour categories');
    }
    const data = await response.json();
    return data.data;
  },

  // Get a single category
  getById: async (id: string): Promise<TourCategoryRecord> => {
    const response = await fetch(`${API_BASE_URL}/tour-categories/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch tour category');
    }
    const data = await response.json();
    return data.data;
  },

  // Create a new category
  create: async (data: Omit<TourCategoryRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<TourCategoryRecord> => {
    const response = await fetch(`${API_BASE_URL}/tour-categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to create tour category');
    }
    const result = await response.json();
    return result.data;
  },

  // Update a category
  update: async (id: string, data: Partial<TourCategoryRecord>): Promise<TourCategoryRecord> => {
    const response = await fetch(`${API_BASE_URL}/tour-categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to update tour category');
    }
    const result = await response.json();
    return result.data;
  },

  // Delete a category
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/tour-categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete tour category');
    }
    await response.json();
  },
};

// Tour Packages API
export interface TourPackageRecord {
  _id: string;
  title: string;
  slug: string;
  category: string | { _id: string; name: string; slug?: string };
  location?: string;
  locations?: string[];
  durationDays: number;
  durationNights: number;
  minPeople: number;
  maxPeople: number;
  isActive: boolean;
  basePrice: number;
  priceUnit: string;
  overviewDescription: string;
  guideType: string;
  languages: string[];
  mainImage: string;
  galleryImages: string[];
  amenities: string[];
  highlights?: string[];
  itinerary: any[];
  // Backend fields
  status?: 'draft' | 'published' | 'archived';
  duration?: { days: number; nights: number };
  startingPrice?: number;
  overview?: { title: string; description: string };
  amenityIds?: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const packagesAPI = {
  getAll: async (category?: string): Promise<TourPackageRecord[]> => {
    const url = category ? `${API_BASE_URL}/packages?category=${category}` : `${API_BASE_URL}/packages`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch packages');
    }
    const data = await response.json();
    return data.data;
  },

  getById: async (id: string): Promise<TourPackageRecord> => {
    const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch package');
    }
    const data = await response.json();
    return data.data;
  },

  create: async (data: Partial<TourPackageRecord>): Promise<TourPackageRecord> => {
    const response = await fetch(`${API_BASE_URL}/packages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to create package');
    }
    const result = await response.json();
    return result.data;
  },

  update: async (id: string, data: Partial<TourPackageRecord>): Promise<TourPackageRecord> => {
    const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to update package');
    }
    const result = await response.json();
    return result.data;
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete package');
    }
    // Delete returns { success: true, message: ... }
    await response.json();
  },

  uploadImage: async (file: File): Promise<{ url: string; public_id: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/packages/upload`, {
      method: 'POST',
      headers: headers, // Do not set Content-Type for FormData
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload image');
    }
    const result = await response.json();
    return result.data;
  }
};



// Destinations API
export interface DestinationRecord {
  _id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  packageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const destinationsAPI = {
  // Get all destinations
  getAll: async (): Promise<DestinationRecord[]> => {
    const response = await fetch(`${API_BASE_URL}/destinations`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch destinations');
    }
    const data = await response.json();
    return data.data;
  },

  // Get a single destination
  getById: async (id: string): Promise<DestinationRecord> => {
    const response = await fetch(`${API_BASE_URL}/destinations/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch destination');
    }
    const data = await response.json();
    return data.data;
  },

  // Create a new destination
  create: async (data: Omit<DestinationRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<DestinationRecord> => {
    const response = await fetch(`${API_BASE_URL}/destinations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to create destination');
    }
    const result = await response.json();
    return result.data;
  },

  // Update a destination
  update: async (id: string, data: Partial<DestinationRecord>): Promise<DestinationRecord> => {
    const response = await fetch(`${API_BASE_URL}/destinations/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to update destination');
    }
    const result = await response.json();
    return result.data;
  },

  // Delete a destination
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/destinations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete destination');
    }
    await response.json();
  },
};

// Telecaller API
export const telecallerAPI = {
  // Get all leads
  getAll: async (): Promise<TelecallerLeadRecord[]> => {
    const response = await fetch(`${API_BASE_URL}/telecaller-leads`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch telecaller leads');
    }
    return response.json();
  },

  // Create a new lead
  create: async (data: Omit<TelecallerLeadRecord, '_id' | 'uniqueId'>): Promise<TelecallerLeadRecord> => {
    const response = await fetch(`${API_BASE_URL}/telecaller-leads`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to create telecaller lead');
    }
    return response.json();
  },

  // Update a lead
  update: async (id: string, data: Partial<TelecallerLeadRecord>): Promise<TelecallerLeadRecord> => {
    const response = await fetch(`${API_BASE_URL}/telecaller-leads/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to update telecaller lead');
    }
    return response.json();
  },

  // Transfer a lead
  transfer: async (id: string, userId: string): Promise<TelecallerLeadRecord> => {
    const response = await fetch(`${API_BASE_URL}/telecaller-leads/${id}/transfer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to transfer lead');
    }
    return response.json();
  },

  // Delete a lead
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/telecaller-leads/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete telecaller lead');
    }
  },

  // Get sources specific to telecalling
  getSources: async (): Promise<{ _id: string, name: string }[]> => {
    const response = await fetch(`${API_BASE_URL}/telecaller-sources`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch telecaller sources');
    }
    return response.json();
  },

  // Get destinations specific to telecalling
  getDestinations: async (): Promise<{ _id: string, name: string }[]> => {
    const response = await fetch(`${API_BASE_URL}/telecaller-destinations`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch telecaller destinations');
    }
    return response.json();
  },

  // Create a destination specific to telecalling
  createDestination: async (data: { name: string }): Promise<{ _id: string, name: string }> => {
    const response = await fetch(`${API_BASE_URL}/telecaller-destinations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to create telecaller destination');
    }
    return response.json();
  },

  // Delete a destination specific to telecalling
  deleteDestination: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/telecaller-destinations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete telecaller destination');
    }
  },

  // Get logs
  getLogs: async (filters: {
    startDate?: string,
    endDate?: string,
    userId?: string,
    action?: string,
    page?: number,
    limit?: number
  }): Promise<{ data: any[], pagination: any }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${API_BASE_URL}/telecaller-logs?${params.toString()}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch logs');
    }
    return response.json();
  },
};

// Telecaller Trash API
export const telecallerTrashAPI = {
  // Get all trash items
  getAll: async (): Promise<TelecallerTrashRecord[]> => {
    const response = await fetch(`${API_BASE_URL}/telecaller-trash`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      throw new Error('Failed to fetch trash items');
    }
    return response.json();
  },

  // Restore a lead
  restore: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/telecaller-trash/restore/${id}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to restore lead');
    }
    return response.json();
  },

  // Permanently delete a lead
  deleteForever: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/telecaller-trash/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete lead permanently');
    }
    return response.json();
  }
};
