import { Navigate, Outlet } from "react-router-dom";
import { useSessionStore } from "@/entities/session/model/sessionStore";

export function RequireAuth() {
  const authenticated = useSessionStore((s) => s.isAuthenticated());

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
