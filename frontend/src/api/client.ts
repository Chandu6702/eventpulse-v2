import axios, { AxiosError } from 'axios';
import type { AuthResponse } from './types';

/**
 * The access token lives only in memory (never localStorage) — XSS cannot
 * steal what is not persisted. Long-lived sessions come from the httpOnly
 * refresh cookie, which scripts cannot read either.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

/** Single-flight refresh: concurrent 401s share one refresh call. */
async function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= axios
    .post<AuthResponse>('/api/v1/auth/refresh')
    .then((response) => {
      setAccessToken(response.data.accessToken);
      return response.data.accessToken;
    })
    .catch(() => {
      setAccessToken(null);
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config;
  if (
    error.response?.status === 401 &&
    original &&
    !original.headers?.['X-Retried'] &&
    !original.url?.includes('/auth/')
  ) {
    const token = await refreshAccessToken();
    if (token) {
      original.headers['X-Retried'] = '1';
      original.headers.Authorization = `Bearer ${token}`;
      return api.request(original);
    }
  }
  return Promise.reject(error);
});

export function problemDetail(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; errors?: Record<string, string> };
    if (data?.errors && Object.keys(data.errors).length > 0) {
      return Object.entries(data.errors)
        .map(([field, message]) => `${field}: ${message}`)
        .join(', ');
    }
    if (data?.detail) {
      return data.detail;
    }
  }
  return 'Something went wrong. Please try again.';
}
