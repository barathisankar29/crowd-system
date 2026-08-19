import { loadSession } from "../state/session";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function authHeaders(): Record<string, string> {
  const user = loadSession();
  if (!user) return {};
  return { "X-User-Role": user.roleKey, "X-User-Name": user.name };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...authHeaders(),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Could not reach the backend. Is it running?");
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // no JSON body
    }
    const message =
      (body as { message?: string } | null)?.message ?? `Request failed (${response.status})`;
    throw new ApiError(response.status, message, body);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiGet = <T,>(path: string) => request<T>(path);

export const apiPost = <T,>(path: string, data?: unknown) =>
  request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined });

export const apiPatch = <T,>(path: string, data?: unknown) =>
  request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined });

export const apiDelete = <T,>(path: string, hard = false) =>
  request<T>(`${path}${hard ? "?hard=true" : ""}`, { method: "DELETE" });

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method: "POST", body: form, headers: authHeaders() });
  } catch {
    throw new ApiError(0, "Could not reach the backend. Is it running?");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, (body as { message?: string })?.message ?? "Upload failed", body);
  }
  return body as T;
}

export { API_BASE };
