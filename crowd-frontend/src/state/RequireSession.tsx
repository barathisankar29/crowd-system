import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "./SessionContext";

export function RequireSession({ children }: { children: ReactNode }) {
  const { currentUser } = useSession();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
