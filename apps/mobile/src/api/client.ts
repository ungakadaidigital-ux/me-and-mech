import { API_BASE_URL } from '../config/env';
import { useAuthStore } from '../store/auth.store';
import type { ApiResponse } from '@me-and-mech/shared';

export class ApiError extends Error {
  constructor(public code: string, message: string, public statusCode: number, public details?: unknown) {
    super(message);
  }
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, updateAccessToken, clearSession } = useAuthStore.getState();
  if (!refreshToken) throw new ApiError('ERR_NO_SESSION', 'No session', 401);

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    await clearSession();
    throw new ApiError('ERR_SESSION_EXPIRED', 'Session expired', 401);
  }

  const body = await response.json();
  await updateAccessToken(body.accessToken);
  return body.accessToken;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  isFormData?: boolean;
  skipAuth?: boolean;
}

/**
 * PKG-039 — API Client. Single choke point for every backend call from
 * the app: auth header injection, one automatic 401-retry-after-refresh,
 * and consistent ApiError shape matching the backend's ApiResponse envelope.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isFormData = false, skipAuth = false } = options;

  const doFetch = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (token && !skipAuth) headers.Authorization = `Bearer ${token}`;

    return fetch(`${API_BASE_URL}/api/v1${path}`, {
      method,
      headers,
      body: body ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
    });
  };

  let token = useAuthStore.getState().accessToken;
  let response = await doFetch(token);

  if (response.status === 401 && !skipAuth) {
    if (!refreshPromise) refreshPromise = refreshAccessToken().finally(() => (refreshPromise = null));
    try {
      token = await refreshPromise;
      response = await doFetch(token);
    } catch {
      throw new ApiError('ERR_SESSION_EXPIRED', 'Session expired — please login again', 401);
    }
  }

  const json = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !json?.success) {
    const err = json && !json.success ? json.error : null;
    throw new ApiError(err?.code ?? 'ERR_UNKNOWN', err?.message ?? 'Something went wrong', response.status, err?.details);
  }

  return json.data;
}
