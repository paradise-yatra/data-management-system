export interface AuthLogRecord {
  _id: string;
  action: 'user_login' | 'user_logout';
  userId: string;
  userName: string;
  userEmail: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  formattedDetails: string;
  details?: {
    deviceType?: string;
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
}

export interface LogsResponse {
  logs: AuthLogRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LogUser {
  _id: string;
  name: string;
  email: string;
}

export interface LogAction {
  value: string;
  label: string;
}
