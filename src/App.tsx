// src/App.tsx
import { Navigate, Route, HashRouter as Router, Routes } from "react-router-dom";

import { AuthProvider } from "@/auth/AuthContext";
import Home from "@/pages/Home";
import { I18nProvider } from "@/i18n/I18nProvider";
import Login from "@/pages/Login";
import ProtectedRoute from "@/routes/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <Router>
          <Routes>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<Home />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </I18nProvider>
    </AuthProvider>
  );
}
