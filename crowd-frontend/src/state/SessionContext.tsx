import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getPermissionMatrix } from "../api/permissions";
import type { Role } from "../types/permissions";
import { clearSession, loadSession, saveSession, type CurrentUser } from "./session";

interface SessionContextValue {
  currentUser: CurrentUser | null;
  roles: Role[];
  loadingRoles: boolean;
  signIn: (user: CurrentUser) => void;
  signOut: () => void;
  hasPermission: (key: string) => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => loadSession());
  const [roles, setRoles] = useState<Role[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    let mounted = true;
    getPermissionMatrix()
      .then((result) => {
        if (!mounted) return;
        setRoles(result.roles);
        setMatrix(result.matrix);
      })
      .catch(() => {
        // Roles endpoint unreachable at boot — sign-in still works with an
        // empty role list; permission checks simply fail closed until a
        // reload succeeds.
      })
      .finally(() => {
        if (mounted) setLoadingRoles(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const permissions = useMemo(() => {
    if (!currentUser) return new Set<string>();
    return new Set(matrix[currentUser.roleKey] ?? []);
  }, [currentUser, matrix]);

  const value: SessionContextValue = {
    currentUser,
    roles,
    loadingRoles,
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

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
