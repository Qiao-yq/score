import type { ApiError } from '@task/contracts';
import { getToken } from './auth';
import { API_BASE } from './env';

export class ApiException extends Error {
  constructor(
    public readonly body: ApiError,
    public readonly status: number,
  ) {
    super(body.message ?? `HTTP ${status}`);
    this.name = 'ApiException';
  }
}

/** 统一 fetch 封装：注入 JWT + JSON 头，非 2xx 抛 ApiException。 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let body: ApiError;
    try {
      body = (await res.json()) as ApiError;
    } catch {
      body = { code: 'INTERNAL', message: res.statusText };
    }
    throw new ApiException(body, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
