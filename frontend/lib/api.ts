/**
 * Single fetch wrapper for every backend call. Centralising this means:
 *  - the API base URL is read from env in exactly one place
 *  - every error is thrown as the same ApiError shape, matching the
 *    backend's {"detail": "..."} response (see backend/app/schemas/common.py)
 *  - the auth token is attached automatically, so call sites never touch it
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_STORAGE_KEY = "wctv_access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

export function clearToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // response body wasn't JSON - keep the generic message
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/**
 * Expands a shortened Google Maps link (maps.app.goo.gl/..., goo.gl/maps/...)
 * to the real URL it redirects to, via the backend - browsers can't read a
 * cross-origin redirect's final URL themselves. See
 * lib/google-maps-link.ts for parsing the result into coordinates.
 */
export async function resolveMapsLink(url: string): Promise<string> {
  const { resolved_url } = await apiFetch<{ resolved_url: string }>("/api/geocode/expand-url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  return resolved_url;
}
