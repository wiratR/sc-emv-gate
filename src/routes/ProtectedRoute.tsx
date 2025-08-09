// src/routes/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";

export default function ProtectedRoute() {
  const { user } = useAuth();
  const loc = useLocation();

  if (!user) {
    window.logger?.info("[router] block anonymous → /login", { from: loc.pathname });
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  window.logger?.info("[router] allow", { path: loc.pathname, user: user.username, role: user.role });
  return <Outlet />;
}