import { LeadRecord } from '@/types/record';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

// User type for API
export interface UserRecord {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Auth API
export const authAPI = {
  // Login
  login: async (email: string, password: string): Promise<{ token: string; user: UserRecord }> => {
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

  // Get current user
  getCurrentUser: async (): Promise<{ user: UserRecord }> => {
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
};

// Users API (admin only)
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

  // Create a new user
  create: async (data: { email: string; password: string; name: string; role?: string }): Promise<UserRecord> => {
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

  // Update a user
  update: async (id: string, data: Partial<{ email: string; name: string; role: string; isActive: boolean; password: string }>): Promise<UserRecord> => {
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

  // Change user role
  changeRole: async (id: string, role: string): Promise<UserRecord> => {
    const response = await fetch(`${API_BASE_URL}/users/${id}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
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
};

