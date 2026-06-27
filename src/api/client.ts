// ─── API Client ───────────────────────────────────────────────────────────────
// Single source of truth for all backend communication.
// Handles: JWT access token injection, 401 auto-refresh, typed responses.

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

interface ApiError {
  error: string;
  message: string;
  details?: unknown[];
}

export class ApiException extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retried = false
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(path, { ...options, headers, credentials: "include" });

  // If 401 and haven't retried — attempt token refresh
  if (response.status === 401 && !retried) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiFetch<T>(path, options, true);
    }
    // Refresh failed — clear auth state
    setAccessToken(null);
    throw new ApiException(401, "SESSION_EXPIRED", "Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    let errorBody: ApiError;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { error: "UNKNOWN_ERROR", message: response.statusText };
    }
    throw new ApiException(response.status, errorBody.error, errorBody.message);
  }

  // 204 No Content
  if (response.status === 204) return {} as T;

  return response.json() as Promise<T>;
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── HTTP method helpers ──────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) =>
    apiFetch<T>(path, { method: "GET" }),

  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: "DELETE" }),
};
