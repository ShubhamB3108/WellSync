import axios from 'axios';
import { useAuthStore } from '../state/authStore';
import {
  AuthResponse,
  WellListResponse,
  DigitalTwinState,
  DynoCard,
  CssOptimizeResponse,
  SrpOptimizeResponse,
  OptimizationRun,
  AlertListResponse,
  Alert,
  FieldSummary,
  User
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach bearer token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const res = await axios.post<AuthResponse>(`${BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          useAuthStore.getState().setAccessToken(res.data.access_token);
          originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
          return apiClient(originalRequest);
        } catch (refreshErr) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Typed API modules
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return res.data;
  },
  logout: async () => {
    return apiClient.post('/auth/logout');
  },
  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },
};

export const wellsApi = {
  list: async (page = 1, pageSize = 25, status?: string): Promise<WellListResponse> => {
    const params: any = { page, page_size: pageSize };
    if (status) params.status = status;
    const res = await apiClient.get<WellListResponse>('/wells', { params });
    return res.data;
  },
  getState: async (wellId: string): Promise<DigitalTwinState> => {
    const res = await apiClient.get<DigitalTwinState>(`/wells/${wellId}/state`);
    return res.data;
  },
};

export const cssApi = {
  optimize: async (
    wellId: string,
    steamVolumeRange: [number, number],
    soakTimeRange: [number, number],
    minRecovery = 300
  ): Promise<CssOptimizeResponse> => {
    const res = await apiClient.post<CssOptimizeResponse>(`/css/optimize/${wellId}`, {
      steam_volume_m3_range: steamVolumeRange,
      soak_time_hours_range: soakTimeRange,
      min_recovery_bbl: minRecovery,
    });
    return res.data;
  },
  plan: async (
    wellId: string,
    params: {
      steam_volume_m3: number;
      soak_time_hours: number;
      injection_pressure_kpa?: number;
      steam_temp_c?: number;
    }
  ) => {
    const res = await apiClient.post(`/css/cycles/${wellId}/plan`, {
      ...params,
      is_ai_recommended: true,
    });
    return res.data;
  },
};

export const srpApi = {
  getDynoCards: async (wellId: string, limit = 10): Promise<DynoCard[]> => {
    const res = await apiClient.get<DynoCard[]>(`/srp/dyno-cards/${wellId}`, {
      params: { limit },
    });
    return res.data;
  },
  optimize: async (wellId: string): Promise<SrpOptimizeResponse> => {
    const res = await apiClient.post<SrpOptimizeResponse>(`/srp/optimize/${wellId}`, {});
    return res.data;
  },
};

export const optimizationApi = {
  approve: async (runId: string): Promise<OptimizationRun> => {
    const res = await apiClient.post<OptimizationRun>(`/optimization-runs/${runId}/approve`);
    return res.data;
  },
  reject: async (runId: string, reason?: string): Promise<OptimizationRun> => {
    const res = await apiClient.post<OptimizationRun>(`/optimization-runs/${runId}/reject`, {
      reason,
    });
    return res.data;
  },
};

export const alertsApi = {
  list: async (page = 1, pageSize = 25, severity?: string, acknowledged?: boolean): Promise<AlertListResponse> => {
    const params: any = { page, page_size: pageSize };
    if (severity) params.severity = severity;
    if (acknowledged !== undefined) params.acknowledged = acknowledged;
    const res = await apiClient.get<AlertListResponse>('/alerts', { params });
    return res.data;
  },
  acknowledge: async (alertId: string): Promise<Alert> => {
    const res = await apiClient.post<Alert>(`/alerts/${alertId}/acknowledge`);
    return res.data;
  },
};

export const reportsApi = {
  getFieldSummary: async (periodDays = 90): Promise<FieldSummary> => {
    const res = await apiClient.get<FieldSummary>('/reports/field-summary', {
      params: { format: 'json', period_days: periodDays },
    });
    return res.data;
  },
  downloadReport: (format: 'pdf' | 'csv', periodDays = 90) => {
    const token = useAuthStore.getState().accessToken;
    const url = `${BASE_URL}/reports/field-summary?format=${format}&period_days=${periodDays}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `wellsync_report_${periodDays}d.${format}`;
    // For browser download with auth:
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        a.href = blobUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      });
  },
};

export const adminApi = {
  listUsers: async (): Promise<User[]> => {
    const res = await apiClient.get<User[]>('/admin/users');
    return res.data;
  },
  createUser: async (user: { email: string; password: string; full_name: string; role: string }): Promise<User> => {
    const res = await apiClient.post<User>('/admin/users', user);
    return res.data;
  },
  switchIngestionSource: async (sourceType: 'simulator' | 'csv_import', file?: File) => {
    const formData = new FormData();
    formData.append('source_type', sourceType);
    if (file) {
      formData.append('csv_file', file);
    }
    const res = await apiClient.post('/admin/ingestion/source', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};
