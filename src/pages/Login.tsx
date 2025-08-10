// src/pages/Login.tsx
import { FormEvent, useRef, useState } from "react";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import LogoSVG from "@/assets/logo.svg?react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function Login() {
  const { user, login } = useAuth();
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showPw, setShowPw] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // ถ้าล็อกอินแล้ว → ไปตาม role
  if (user) {
    const target = user.role === "admin" ? "/settings" : "/home";
    window.logger?.info("[login] already logged-in → navigate (by role)", { role: user.role, target });
    return <Navigate to={target} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return; // กันกดซ้ำ
    setErr("");
    setLoading(true);

    const f = new FormData(e.currentTarget as HTMLFormElement);
    const username = String(f.get("username") ?? "").trim();
    const password = String(f.get("password") ?? "");

    window.logger?.info("[login] submit", { username });

    const ok = await login(username, password);
    setLoading(false);

    if (ok) {
      window.logger?.info("[login] success");
    } else {
      setErr(t("invalid_credentials"));
      window.logger?.warn("[login] failed", { username });
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-100 p-4">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="relative w-full max-w-md bg-white p-8 rounded-2xl shadow text-center"
        autoComplete="on"
      >
        {/* เปลี่ยนภาษา */}
        <div className="absolute right-4 top-4">
          <LanguageSwitcher />
        </div>

        {/* โลโก้ */}
        {/* <img
          src={logo}
          alt="Logo"
          className="w-32 h-auto mx-auto mb-4 select-none"
          draggable={false}
        /> */}

        <LogoSVG className="w-32 h-auto mx-auto mb-4 select-none" /> {/* ✅ โลโก้ SCG */}

        <h1 className="text-2xl font-semibold mb-4">{t("login_title")}</h1>

        {/* Username */}
        <label className="block text-left">
          <span className="text-sm">{t("username")}</span>
          <input
            name="username"
            required
            autoFocus
            autoComplete="username"
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder={t("username_placeholder")}
          />
        </label>

        {/* Password + toggle */}
        <label className="block text-left mt-3">
          <span className="text-sm">{t("password")}</span>
          <div className="mt-1 relative">
            <input
              name="password"
              required
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              className="w-full rounded-lg border px-3 py-2 pr-20"
              placeholder={t("password_placeholder")}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded border hover:bg-gray-50"
              tabIndex={-1}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {/* Error */}
        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

        {/* Submit */}
        <button
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-blue-600 text-white py-2 hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? t("signing_in") : t("login")}
        </button>
      </form>
    </div>
  );
}
