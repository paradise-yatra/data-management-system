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
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
};

// Types
export type CostItemType = 'hotel' | 'transfer' | 'activity' | 'sightseeing' | 'other';
export type CostType = 'per_person' | 'per_night' | 'per_vehicle' | 'flat';

export interface CostItem {
  _id: string;
  name: string;
  type: CostItemType;
  destination: string;
  costType: CostType;
  baseCost: number;
  currency: string;
  validityStart?: string | null;
  validityEnd?: string | null;
  description?: string;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface City {
  _id: string;
  name: string;
  country?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItem {
  costItemId: string;
  name: string;
  costType: CostType;
  baseCost: number;
}

export interface TransferItem extends ServiceItem {
  tripCount: number;
}

export interface Day {
  dayNumber: number;
  date?: string | null;
  hotel?: {
    costItemId: string;
    name: string;
    costType: CostType;
    baseCost: number;
  } | null;
  activities: ServiceItem[];
  transfers: TransferItem[];
  sightseeings: ServiceItem[];
  otherServices: ServiceItem[];
  notes?: string;
}

export interface Itinerary {
  _id: string;
  itineraryNumber: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  destinations: string[];
  travelDates: {
    startDate: string;
    endDate: string;
  };
  pax: {
    adults: number;
    children: number;
    total: number;
  };
  nights: number;
  rooms: number;
  days: Day[];
  pricing: {
    subtotal: number;
    markup: {
      percentage: number;
      amount: number;
      isCustom: boolean;
    };
    total: number;
    currency: string;
    lastCalculatedAt?: string;
    calculationVersion: number;
  };
  status: 'draft' | 'sent' | 'confirmed' | 'cancelled';
  lockedAt?: string | null;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryListResponse {
  success: boolean;
  data: Itinerary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CostItemListResponse {
  success: boolean;
  data: CostItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Cost Items API
export const costItemsAPI = {
  getAll: async (params?: {
    type?: CostItemType;
    destination?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<CostItemListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.destination) queryParams.append('destination', params.destination);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `${API_BASE_URL}/cost-items${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch cost items');
    }
    return response.json();
  },

  getById: async (id: string): Promise<{ success: boolean; data: CostItem }> => {
    const response = await fetch(`${API_BASE_URL}/cost-items/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch cost item');
    }
    return response.json();
  },

  create: async (data: Omit<CostItem, '_id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<{ success: boolean; data: CostItem; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/cost-items`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to create cost item');
    }
    return response.json();
  },

  update: async (id: string, data: Partial<CostItem>): Promise<{ success: boolean; data: CostItem; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/cost-items/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to update cost item');
    }
    return response.json();
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/cost-items/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete cost item');
    }
    return response.json();
  },
};

// Cities API
export const citiesAPI = {
  getAll: async (params?: { isActive?: boolean; search?: string }): Promise<{ success: boolean; data: City[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.search) queryParams.append('search', params.search);

    const url = `${API_BASE_URL}/cities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch cities');
    }
    return response.json();
  },

  create: async (data: Omit<City, '_id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data: City; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/cities`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to create city');
    }
    return response.json();
  },
};

// Itineraries API
export const itinerariesAPI = {
  getAll: async (params?: {
    status?: string;
    clientName?: string;
    startDate?: string;
    endDate?: string;
    createdBy?: string;
    page?: number;
    limit?: number;
  }): Promise<ItineraryListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.clientName) queryParams.append('clientName', params.clientName);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.createdBy) queryParams.append('createdBy', params.createdBy);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `${API_BASE_URL}/itineraries${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch itineraries');
    }
    return response.json();
  },

  getById: async (id: string): Promise<{ success: boolean; data: Itinerary }> => {
    const response = await fetch(`${API_BASE_URL}/itineraries/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch itinerary');
    }
    return response.json();
  },

  create: async (data: Omit<Itinerary, '_id' | 'itineraryNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'pricing'> & { markupPercentage?: number }): Promise<{ success: boolean; data: Itinerary; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/itineraries`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to create itinerary');
    }
    return response.json();
  },

  update: async (id: string, data: Partial<Itinerary> & { markupPercentage?: number }): Promise<{ success: boolean; data: Itinerary; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/itineraries/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to update itinerary');
    }
    return response.json();
  },

  recalculate: async (id: string): Promise<{ success: boolean; data: Itinerary; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/itineraries/${id}/recalculate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to recalculate itinerary');
    }
    return response.json();
  },

  lock: async (id: string): Promise<{ success: boolean; data: Itinerary; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/itineraries/${id}/lock`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to lock itinerary');
    }
    return response.json();
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/itineraries/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete itinerary');
    }
    return response.json();
  },
};

// Settings API
export const settingsAPI = {
  getAll: async (): Promise<{ success: boolean; data: Record<string, any> }> => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch settings');
    }
    return response.json();
  },

  updateMarkup: async (percentage: number): Promise<{ success: boolean; data: any; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/settings/markup`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ percentage }),
      credentials: 'include',
    });
    if (!response.ok) {
      handleAuthError(response);
      const error = await response.json();
      throw new Error(error.message || 'Failed to update markup');
    }
    return response.json();
  },
};


