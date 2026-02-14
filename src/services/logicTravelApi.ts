const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const handleAuthError = (response: Response) => {
  if (response.status === 401) {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    handleAuthError(response);
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

export type PlaceCategory = 'SIGHTSEEING' | 'FOOD' | 'ADVENTURE' | 'RELAXATION' | 'SHOPPING';

export interface Place {
  _id: string;
  name: string;
  description?: string;
  category: PlaceCategory;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  avgDurationMin: number;
  opensAt: string;
  closesAt: string;
  closedDays: string[];
  priceForeigner: number;
  priceDomestic: number;
  isActive: boolean;
}

export interface PlaceClosureRange {
  startTime: string;
  endTime: string;
}

export interface PlaceClosure {
  _id: string;
  placeId: string;
  date: string;
  reason: string;
  isClosedFullDay: boolean;
  closedRanges: PlaceClosureRange[];
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryBuilderSetting {
  _id: string;
  key: string;
  value: unknown;
  description?: string;
  updatedAt: string;
}

export interface TripEvent {
  _id?: string;
  placeId: string;
  order: number;
  startTime?: string | null;
  endTime?: string | null;
  travelTimeMin?: number;
  distanceKm?: number;
  validationStatus?: 'VALID' | 'INVALID';
  validationReason?: string | null;
  routeProvider?: 'OSRM' | 'HAVERSINE' | 'STATIC';
}

export interface TripDay {
  date: string;
  dayIndex: number;
  events: TripEvent[];
}

export interface Trip {
  _id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'READY' | 'CONFIRMED' | 'CANCELLED';
  days: TripDay[];
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryPdfTraveler {
  leadName?: string;
  adults: number;
  children: number;
  infants: number;
  nationality: 'DOMESTIC' | 'FOREIGNER';
  contactPhone?: string;
  contactEmail?: string;
}

export interface ItineraryPdfPricingSummary {
  baseAmount: number;
  markupPercent: number;
  markupAmount: number;
  discountAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  totalFormatted: string;
}

export interface ItineraryPdfLineItem {
  label: string;
  amount: number;
}

export interface ItineraryPdfPricingSection {
  currencyCode: string;
  lineItems: ItineraryPdfLineItem[];
  summary: ItineraryPdfPricingSummary;
}

export interface ItineraryPdfEvent {
  order: number;
  placeId: string;
  placeName: string;
  category: PlaceCategory | string;
  description?: string;
  imageUrl?: string | null;
  startTime: string;
  endTime: string;
  durationMin: number;
  travelTimeMin: number;
  distanceKm: number;
  routeProvider: 'OSRM' | 'HAVERSINE' | 'STATIC' | string;
  validationStatus: 'VALID' | 'INVALID';
  validationReason?: string | null;
  prices: {
    domestic: number;
    foreigner: number;
  };
}

export interface ItineraryPdfDaySection {
  dayIndex: number;
  dayNumber: number;
  date: string;
  dateLabel: string;
  title: string;
  events: ItineraryPdfEvent[];
  summary: {
    eventCount: number;
    dayDistanceKm: number;
    dayTravelTimeMin: number;
    dayVisitDurationMin: number;
    dayTravelLabel: string;
  };
}

export interface ItineraryPdfViewModel {
  tripId: string;
  tripName: string;
  status: Trip['status'];
  locale: string;
  timezone: string;
  currencyCode: string;
  generatedAt: string;
  generatedAtLabel: string;
  generatedBy?: string | null;
  tripPeriod: {
    startDate: string;
    endDate: string;
    startDateLabel: string;
    endDateLabel: string;
    totalDays: number;
  };
  traveler: ItineraryPdfTraveler;
  summary: {
    totalDays: number;
    totalEvents: number;
    totalDistanceKm: number;
    totalTravelTimeMin: number;
    totalVisitDurationMin: number;
    totalDistanceLabel: string;
    totalTravelLabel: string;
    totalVisitLabel: string;
  };
  daySections: ItineraryPdfDaySection[];
  pricing: ItineraryPdfPricingSection;
  inclusions: string[];
  exclusions: string[];
  notes: string[];
  terms: string[];
  agency: {
    name: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  metadata: {
    source: 'TRIP_DAYS' | 'DRAFT_DAYS';
    templateVersion: string;
    renderMode: string;
    generatedTimestamp: number;
  };
}

export interface RenderValidationReport {
  pass: number;
  hasViolations: boolean;
  overflowViolations: Array<{ pageBodyIndex: number; overflowY: number; overflowX: number }>;
  overlapViolations: Array<{ pageBodyIndex: number; aIndex: number; bIndex: number }>;
  orphanHeadingViolations: Array<{ pageBodyIndex: number; heading: string; spaceBelow: number }>;
}

export interface ItineraryDocument {
  _id: string;
  tripId: string;
  version: number;
  templateVersion: string;
  renderMode: string;
  status: 'SUCCESS' | 'FAILED';
  checksum: string;
  pageCount: number;
  fileSizeBytes: number;
  generatedAt: string;
  generatedBy?: string | null;
  failureReason?: string | null;
  downloadUrl?: string | null;
}

export interface RenderPdfResponse {
  documentId: string;
  version: number;
  pageCount: number;
  checksum: string;
  downloadUrl: string;
  renderValidationReport: RenderValidationReport;
}

export interface PdfRenderPayload {
  draftDays?: Array<{
    dayIndex: number;
    date: string;
    events: Array<{
      placeId: string;
      order?: number;
      startTime?: string | null;
      endTime?: string | null;
      travelTimeMin?: number;
      distanceKm?: number;
      validationStatus?: 'VALID' | 'INVALID';
      validationReason?: string | null;
      routeProvider?: 'OSRM' | 'HAVERSINE' | 'STATIC';
    }>;
  }>;
  traveler?: Partial<ItineraryPdfTraveler>;
  pricing?: {
    markupPercent?: number;
    gstPercent?: number;
    discountAmount?: number;
  };
  notes?: string[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  warnings?: string[];
}

export const logicTravelApi = {
  places: {
    list: (params?: {
      category?: PlaceCategory;
      search?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.category) query.append('category', params.category);
      if (params?.search) query.append('search', params.search);
      if (typeof params?.isActive === 'boolean') {
        query.append('isActive', String(params.isActive));
      }
      if (params?.page) query.append('page', String(params.page));
      if (params?.limit) query.append('limit', String(params.limit));
      const queryString = query.toString();
      return request<ApiEnvelope<Place[]> & { pagination?: unknown }>(
        `/places${queryString ? `?${queryString}` : ''}`
      );
    },
    create: (payload: {
      name: string;
      description?: string;
      category: PlaceCategory;
      location: { type?: 'Point'; coordinates: [number, number] };
      avgDurationMin: number;
      opensAt: string;
      closesAt: string;
      closedDays?: string[];
      priceForeigner?: number;
      priceDomestic?: number;
      isActive?: boolean;
    }) =>
      request<ApiEnvelope<Place>>('/places', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (placeId: string, payload: Partial<Place>) =>
      request<ApiEnvelope<Place>>(`/places/${placeId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    remove: (placeId: string) =>
      request<ApiEnvelope<null>>(`/places/${placeId}`, {
        method: 'DELETE',
      }),
  },
  trips: {
    list: (params?: { userId?: string; status?: Trip['status']; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.userId) query.append('userId', params.userId);
      if (params?.status) query.append('status', params.status);
      if (params?.page) query.append('page', String(params.page));
      if (params?.limit) query.append('limit', String(params.limit));
      const queryString = query.toString();
      return request<ApiEnvelope<Trip[]> & { pagination?: unknown }>(
        `/trips${queryString ? `?${queryString}` : ''}`
      );
    },
    getById: (tripId: string) => request<ApiEnvelope<Trip>>(`/trips/${tripId}`),
    create: (payload: {
      userId?: string;
      name: string;
      startDate: string;
      endDate: string;
      status?: Trip['status'];
    }) =>
      request<ApiEnvelope<Trip>>('/trips', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    saveDay: (
      tripId: string,
      dayIndex: number,
      payload: {
        date: string;
        dayStartTime?: string;
        transitionBufferMin?: number;
        events: Array<{ placeId: string; order: number }>;
      }
    ) =>
      request<ApiEnvelope<Trip>>(`/trips/${tripId}/days/${dayIndex}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    recalculateDay: (tripId: string, dayIndex: number) =>
      request<ApiEnvelope<Trip>>(`/trips/${tripId}/auto-schedule-day/${dayIndex}`, {
        method: 'POST',
      }),
    recalculateAll: (tripId: string) =>
      request<ApiEnvelope<Trip>>(`/trips/${tripId}/recalculate-all`, {
        method: 'POST',
      }),
    getPdfPreviewData: (tripId: string, payload: PdfRenderPayload = {}) =>
      request<ApiEnvelope<ItineraryPdfViewModel>>(`/trips/${tripId}/pdf/preview-data`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    renderPdf: (tripId: string, payload: PdfRenderPayload = {}) =>
      request<ApiEnvelope<RenderPdfResponse>>(`/trips/${tripId}/pdf/render`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    listPdfDocuments: (tripId: string) =>
      request<ApiEnvelope<ItineraryDocument[]>>(`/trips/${tripId}/pdf/documents`),
    downloadPdfDocument: async (tripId: string, documentId: string): Promise<Blob> => {
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}/pdf/documents/${documentId}/download`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        handleAuthError(response);
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to download PDF');
      }

      return response.blob();
    },
  },
  logic: {
    reorderAndRecalculate: (payload: {
      tripId?: string;
      dayIndex?: number;
      date: string;
      dayStartTime?: string;
      transitionBufferMin?: number;
      events: Array<{ placeId: string; order: number }>;
    }) =>
      request<ApiEnvelope<{ events: TripEvent[]; warnings: string[] }>>('/logic/reorder-and-recalculate', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    validate: (payload: { placeId: string; date: string; time: string }) =>
      request<ApiEnvelope<{ valid: boolean; reason?: string }>>('/logic/validate', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    route: (payload: { origin: [number, number]; destination: [number, number] }) =>
      request<
        ApiEnvelope<{ distanceKm: number; travelTimeMin: number; provider: string; cached?: boolean }>
      >('/logic/route', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  closures: {
    list: (params?: { placeId?: string; date?: string }) => {
      const query = new URLSearchParams();
      if (params?.placeId) query.append('placeId', params.placeId);
      if (params?.date) query.append('date', params.date);
      const queryString = query.toString();
      return request<ApiEnvelope<PlaceClosure[]>>(
        `/place-closures${queryString ? `?${queryString}` : ''}`
      );
    },
    create: (payload: {
      placeId: string;
      date: string;
      reason?: string;
      isClosedFullDay?: boolean;
      closedRanges?: PlaceClosureRange[];
    }) =>
      request<ApiEnvelope<PlaceClosure>>('/place-closures', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (
      closureId: string,
      payload: Partial<{
        date: string;
        reason: string;
        isClosedFullDay: boolean;
        closedRanges: PlaceClosureRange[];
      }>
    ) =>
      request<ApiEnvelope<PlaceClosure>>(`/place-closures/${closureId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    remove: (closureId: string) =>
      request<ApiEnvelope<null>>(`/place-closures/${closureId}`, {
        method: 'DELETE',
      }),
  },
  settings: {
    list: () => request<ApiEnvelope<ItineraryBuilderSetting[]>>('/itinerary-builder-settings'),
    update: (key: string, payload: { value: unknown; description?: string }) =>
      request<ApiEnvelope<ItineraryBuilderSetting>>(`/itinerary-builder-settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },
};
