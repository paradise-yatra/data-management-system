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
    const requestError = new Error(error.message || error.error || 'Request failed') as Error & {
      details?: unknown;
      status?: number;
    };
    requestError.details = error.errors;
    requestError.status = response.status;
    throw requestError;
  }

  return response.json();
}

export type ReceiptStatus = 'DRAFT' | 'ISSUED' | 'VOID';
export type ReceiptType = 'ADVANCE' | 'PARTIAL' | 'FULL';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Cheque' | 'Other';
export type ReceiptDocumentFormat = 'PDF' | 'PNG' | 'JPG';

export interface ReceiptPayload {
  type?: ReceiptType;
  linkedLeadId?: string | null;
  linkedTripId?: string | null;
  customer?: {
    leadName?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  tripDetails?: {
    tripName?: string;
    destination?: string;
    travelStartDate?: string | null;
    travelEndDate?: string | null;
  };
  payment?: {
    paymentDate?: string;
    paymentMode?: PaymentMode;
    transactionReference?: string;
    receivedAmount?: number;
  };
  totals?: {
    packageAmount?: number;
    previousPayments?: number;
  };
  notes?: {
    publicNote?: string;
    internalNote?: string;
  };
  brandingSnapshot?: Partial<ReceiptSettingsFormValues>;
}

export interface ReceiptActivityEntry {
  _id: string;
  action: string;
  actorId: string | null;
  actorName: string;
  timestamp: string;
  details: Record<string, unknown> | null;
}

export interface ReceiptRecord {
  _id: string;
  receiptNumber: string | null;
  status: ReceiptStatus;
  type: ReceiptType;
  linkedLeadId: string | null;
  linkedTripId: string | null;
  customer: {
    leadName: string;
    phone: string;
    email: string;
    address: string;
  };
  tripDetails: {
    tripName: string;
    destination: string;
    travelStartDate: string | null;
    travelEndDate: string | null;
  };
  payment: {
    paymentDate: string;
    paymentMode: PaymentMode;
    transactionReference: string;
    receivedAmount: number;
  };
  totals: {
    packageAmount: number;
    previousPayments: number;
    totalReceived: number;
    pendingAmount: number;
  };
  notes: {
    publicNote: string;
    internalNote: string;
    voidReason: string;
  };
  brandingSnapshot: ReceiptSettingsFormValues;
  issuedAt: string | null;
  voidedAt: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  activityTrail: ReceiptActivityEntry[];
}

export interface ReceiptDocumentRecord {
  _id: string;
  receiptId: string;
  version: number;
  format: ReceiptDocumentFormat;
  templateVersion: string;
  renderMode: string;
  status: 'SUCCESS' | 'FAILED';
  checksum: string;
  fileSizeBytes: number;
  widthPx: number | null;
  heightPx: number | null;
  pageCount: number;
  generatedAt: string;
  failureReason: string | null;
  downloadUrl: string | null;
}

export interface ReceiptRenderJobRecord {
  jobId: string;
  receiptId: string;
  format: ReceiptDocumentFormat;
  requestedBy: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  documentId: string | null;
  downloadUrl: string | null;
  checksum: string | null;
  version: number | null;
  error: string | null;
}

export interface ReceiptSettingsFormValues {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  companyGstin: string;
  logoUrl: string;
  footerNote: string;
  primaryColor: string;
  accentColor: string;
  currencyCode: string;
  locale: string;
  timezone: string;
}

export interface ReceiptSettingRecord {
  _id: string;
  key: string;
  value: unknown;
  description: string;
  updatedAt: string;
}

export interface ReceiptViewModel {
  receiptId: string | null;
  receiptNumber: string | null;
  status: ReceiptStatus;
  type: ReceiptType;
  locale: string;
  timezone: string;
  currencyCode: string;
  generatedAt: string;
  generatedAtLabel: string;
  customer: ReceiptRecord['customer'];
  tripDetails: ReceiptRecord['tripDetails'] & {
    travelStartDateLabel: string;
    travelEndDateLabel: string;
  };
  payment: ReceiptRecord['payment'] & {
    paymentDateLabel: string;
    amountLabel: string;
  };
  totals: ReceiptRecord['totals'] & {
    packageAmountLabel: string;
    previousPaymentsLabel: string;
    totalReceivedLabel: string;
    pendingAmountLabel: string;
  };
  notes: ReceiptRecord['notes'];
  agency: ReceiptSettingsFormValues;
  whatsAppSummary: string;
  metadata: {
    source: string;
    templateVersion: string;
    renderMode: string;
    generatedTimestamp: number;
  };
  display: {
    statusLabel: string;
    typeLabel: string;
    amountInWordsHint: string;
  };
}

export interface ReceiptPreviewResponse {
  viewModel: ReceiptViewModel;
  html: string;
  layoutPlan: {
    pageCount: number;
    templateVersion: string;
  };
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const financeApi = {
  receipts: {
    list: (params?: { search?: string; status?: ReceiptStatus | 'ALL'; paymentMode?: PaymentMode | 'ALL' }) => {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.status && params.status !== 'ALL') query.append('status', params.status);
      if (params?.paymentMode && params.paymentMode !== 'ALL') query.append('paymentMode', params.paymentMode);
      const queryString = query.toString();
      return request<ApiEnvelope<ReceiptRecord[]>>(`/finance/receipts${queryString ? `?${queryString}` : ''}`);
    },
    getById: (receiptId: string) =>
      request<ApiEnvelope<ReceiptRecord>>(`/finance/receipts/${receiptId}`),
    create: (payload: ReceiptPayload) =>
      request<ApiEnvelope<ReceiptRecord>>('/finance/receipts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (receiptId: string, payload: ReceiptPayload) =>
      request<ApiEnvelope<ReceiptRecord>>(`/finance/receipts/${receiptId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    preview: (payload: ReceiptPayload) =>
      request<ApiEnvelope<ReceiptPreviewResponse>>('/finance/receipts/preview', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    issue: (receiptId: string) =>
      request<ApiEnvelope<ReceiptRecord>>(`/finance/receipts/${receiptId}/issue`, {
        method: 'POST',
      }),
    void: (receiptId: string, reason: string) =>
      request<ApiEnvelope<ReceiptRecord>>(`/finance/receipts/${receiptId}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    renderDocument: (receiptId: string, format: ReceiptDocumentFormat) =>
      request<
        ApiEnvelope<{
          documentId: string;
          version: number;
          format: ReceiptDocumentFormat;
          checksum: string;
          downloadUrl: string;
          renderValidationReport: unknown;
        }>
      >(`/finance/receipts/${receiptId}/documents/render`, {
        method: 'POST',
        body: JSON.stringify({ format }),
      }),
    startRenderJob: (receiptId: string, format: ReceiptDocumentFormat) =>
      request<ApiEnvelope<ReceiptRenderJobRecord>>(`/finance/receipts/${receiptId}/documents/render-jobs`, {
        method: 'POST',
        body: JSON.stringify({ format }),
      }),
    getRenderJob: (receiptId: string, jobId: string) =>
      request<ApiEnvelope<ReceiptRenderJobRecord>>(`/finance/receipts/${receiptId}/documents/render-jobs/${jobId}`),
    listDocuments: (receiptId: string) =>
      request<ApiEnvelope<ReceiptDocumentRecord[]>>(`/finance/receipts/${receiptId}/documents`),
    downloadDocument: async (receiptId: string, documentId: string): Promise<Blob> => {
      const response = await fetch(
        `${API_BASE_URL}/finance/receipts/${receiptId}/documents/${documentId}/download`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        handleAuthError(response);
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to download document');
      }

      return response.blob();
    },
  },
  settings: {
    list: () => request<ApiEnvelope<ReceiptSettingRecord[]>>('/finance/receipt-settings'),
    update: (key: string, payload: { value: unknown; description?: string }) =>
      request<ApiEnvelope<ReceiptSettingRecord>>(`/finance/receipt-settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },
};
