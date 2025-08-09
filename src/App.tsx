// src/App.tsx

import { Navigate, Route, HashRouter as Router, Routes, useLocation } from "react-router-dom";

import { AuthProvider } from "@/auth/AuthContext";
import Home from "@/pages/Home";
import { I18nProvider } from "@/i18n/I18nProvider";
import Login from "@/pages/Login";
import ProtectedByRole from "@/routes/ProtectedByRole";
import ProtectedRoute from "@/routes/ProtectedRoute";
import Settings from "@/pages/Settings";
import { useEffect } from "react";

function LocationLogger() {
  const loc = useLocation();
  useEffect(() => {
    window.logger?.info("[router] location changed", { hash: location.hash, pathname: loc.pathname });
  }, [loc]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <Router>
          <LocationLogger />
          <Routes>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<Home />} />
              <Route element={<ProtectedByRole allow={["admin"]} />}>
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </I18nProvider>
    </AuthProvider>
  );
}