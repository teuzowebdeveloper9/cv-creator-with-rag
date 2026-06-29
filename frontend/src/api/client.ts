import axios from 'axios';
import type { AxiosError } from 'axios';

export const resolveApiBaseUrl = () => {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBase) return configuredBase.replace(/\/+$/, '');
  if (typeof window === 'undefined') return 'http://localhost:8000/api';
  const { protocol, hostname, port } = window.location;
  if (port === '5173') return `${protocol}//${hostname}:8000/api`;
  return `${window.location.origin.replace(/\/+$/, '')}/api`;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

let csrfTokenCache = '';

export const setCSRFToken = (token: unknown) => {
  if (typeof token === 'string' && token.trim()) {
    csrfTokenCache = token.trim();
  }
};

export const getCSRFToken = () => csrfTokenCache || getCookieValue('csrftoken');

export const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') return '';
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(encodedName));
  return cookie ? decodeURIComponent(cookie.slice(encodedName.length)) : '';
};

export const jsonHeadersWithCSRF = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const csrfToken = getCSRFToken();
  if (csrfToken) headers['X-CSRFToken'] = csrfToken;
  return headers;
};

apiClient.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      config.headers = config.headers || {};
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }
  return config;
});

apiClient.interceptors.response.use((response) => {
  const data = response.data as Record<string, unknown> | undefined;
  setCSRFToken(data?.csrf_token);
  return response;
});

export const extractJsonErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    if (typeof data?.error === 'string' && data.error.trim()) return data.error;
    if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  } catch { }
  return fallback;
};

export const authEndpointCandidates = {
  session: ['/auth/session/', '/session/', '/users/session/'],
  login: ['/auth/login/', '/login/', '/users/login/'],
  register: ['/auth/register/', '/register/', '/users/register/'],
  logout: ['/auth/logout/', '/logout/', '/users/logout/'],
};

export interface AuthUser {
  id?: number;
  username?: string;
  email?: string;
  full_name?: string;
}

export interface AuthState {
  user: AuthUser | null;
  checked: boolean;
  loading: boolean;
  error: string;
}

export const extractErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    const directMessage = data?.detail || data?.error || data?.message;
    if (typeof directMessage === 'string') return directMessage;
    if (Array.isArray(data?.non_field_errors)) return data.non_field_errors.join(' ');
    const fieldMessages = Object.values(data || {})
      .flatMap(value => Array.isArray(value) ? value : typeof value === 'string' ? [value] : [])
      .filter(Boolean);
    return fieldMessages.join(' ') || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export const requestFirstAvailable = async <T,>(
  endpoints: string[],
  options: { method?: 'get' | 'post'; data?: unknown; allowNotFound?: boolean } = {},
) => {
  let notFound = false;
  for (const endpoint of endpoints) {
    try {
      const method = options.method || 'get';
      const response = method === 'post'
        ? await apiClient.post<T>(endpoint, options.data || {})
        : await apiClient.get<T>(endpoint);
      return response.data;
    } catch (error) {
      const status = (error as AxiosError).response?.status;
      if (status === 404) {
        notFound = true;
        continue;
      }
      throw error;
    }
  }
  if (options.allowNotFound && notFound) return null;
  throw new Error('A API de autenticação ainda não está disponível neste backend.');
};

export interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  city: string;
  summary: string;
  photo_url: string;
}

export interface ProviderStatus {
  [key: string]: boolean;
}

export interface UploadQueue {
  active: boolean;
  total: number;
  current: number;
  success: number;
  error: number;
  logs: string[];
}

export interface DocumentRecord {
  id: number;
  name: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  error_message?: string;
  created_at: string;
}
