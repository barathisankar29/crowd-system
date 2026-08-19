export type RoleKey = "admin" | "security_officer" | "authority";

export interface CurrentUser {
  name: string;
  roleKey: RoleKey;
}

const STORAGE_KEY = "crowd-system:session";

export function loadSession(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CurrentUser;
    return parsed?.name && parsed?.roleKey ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(user: CurrentUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
