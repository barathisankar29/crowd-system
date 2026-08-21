export type RoleKey = "admin" | "security_officer" | "authority";

// "development": frontend-only sign-in, no backend/Firebase involved — see SignIn.tsx.
// A future "firebase" mode can be added here once real auth lands, without
// changing how the rest of the app reads currentUser.
export type AuthMode = "development" | "firebase";

export interface CurrentUser {
  name: string;
  email: string;
  roleKey: RoleKey;
  authMode: AuthMode;
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
