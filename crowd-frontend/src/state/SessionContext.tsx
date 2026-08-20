import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { getPermissionMatrix } from "../api/permissions";
import { useApiResource } from "../hooks/useApiResource";
import type { Role } from "../types/permissions";
import { clearSession, loadSession, saveSession, type CurrentUser } from "./session";

interface SessionContextValue {
  currentUser: CurrentUser | null;
  roles: Role[];
  loadingRoles: boolean;
  // Distinct from loadingRoles: true only once the fetch has actually
  // failed, so the UI can tell "still checking" apart from "checked and
  // it's down" instead of collapsing both into one permanent error state.
  rolesUnavailable: boolean;
  retryRoles: () => void;
  signIn: (user: CurrentUser) => void;
  signOut: () => void;
  hasPermission: (key: string) => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => loadSession());
  // Same loading/error/ready pattern every other backend-driven page in the
  // app already uses — reload() gives sign-in a real retry instead of the
  // previous fetch-once-and-give-up behavior. pollMs also means a tab left
  // open across a backend restart (or one that loaded during a brief
  // startup window) self-heals within 5s instead of being stuck showing
  // "unavailable" until someone notices and clicks Retry or reloads.
  const rolesResource = useApiResource(() => getPermissionMatrix(), [], { isEmpty: () => false, pollMs: 5000 });

  const roles = rolesResource.data?.roles ?? [];
  const matrixData = rolesResource.data?.matrix;

  const permissions = useMemo(() => {
    if (!currentUser || !matrixData) return new Set<string>();
    return new Set(matrixData[currentUser.roleKey] ?? []);
  }, [currentUser, matrixData]);

  const value: SessionContextValue = {
    currentUser,
    roles,
    loadingRoles: rolesResource.status === "loading",
    rolesUnavailable: rolesResource.status === "error",
    retryRoles: rolesResource.reload,
    signIn: (user) => {
      saveSession(user);
      setCurrentUser(user);
    },
    signOut: () => {
      clearSession();
      setCurrentUser(null);
    },
    hasPermission: (key) => permissions.has(key),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its provider
export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
