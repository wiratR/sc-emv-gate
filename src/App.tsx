// src/App.tsx

import { Navigate, Route, HashRouter as Router, Routes } from "react-router-dom";

import { AuthProvider } from "@/auth/AuthContext";
import Home from "@/pages/Home";
import { I18nProvider } from "@/i18n/I18nProvider";
import Login from "@/pages/Login";
import ProtectedByRole from "@/routes/ProtectedByRole";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RouteProbe from "@/routes/RouteProbe";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <Router>
          <RouteProbe />
          <Routes>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* 🔒 ต้องล็อกอินก่อนทุกหน้าในบล็อกนี้ */}
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<Home />} />

              {/* 👑 เฉพาะ admin */}
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
