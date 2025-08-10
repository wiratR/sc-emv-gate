// src/routes/ProtectedByRole.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";

type Role = "admin" | "staff" | "maintenance";

export default function ProtectedByRole({ allow }: { allow: Role[] }) {
  const { user } = useAuth();
  const loc = useLocation();

  if (!user) {
    window.logger?.info?.("[guard] ProtectedByRole → anon → /login", { from: loc.pathname });
    return <Navigate to="/login" replace />;
  }
  if (!allow.includes(user.role)) {
    window.logger?.info?.("[guard] ProtectedByRole → deny → /home", { path: loc.pathname, role: user.role, allow });
    return <Navigate to="/home" replace />;
  }
  window.logger?.info?.("[guard] ProtectedByRole → allow", { path: loc.pathname, user: user.username, role: user.role });
  return <Outlet />;
}
