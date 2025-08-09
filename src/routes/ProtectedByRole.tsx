// src/routes/ProtectedByRole.tsx

import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";

export default function ProtectedByRole({ allow }: { allow: Array<"admin"|"staff"|"maintenance"> }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (!allow.includes(user.role as any)) return <Navigate to="/home" replace />;
  return <Outlet />;
}
