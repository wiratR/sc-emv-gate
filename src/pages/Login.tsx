// src/pages/Login.tsx
import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import logo from "@/assets/logo.svg";
import { useAuth } from "@/auth/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";

type Role = "admin" | "staff" | "maintenance";

export default function Login() {
  const { user, login } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ✅ ถ้าล็อกอินอยู่แล้ว ให้เป้าไปตาม role (ไม่ใช้ loc.state/จากไหนทั้งนั้น)
  if (user) {
    const target = user.role === "admin" ? "/settings" : "/home";
    window.logger?.info("[login] already logged-in → navigate (by role)", {
      role: user.role,
      target,
    });
    return <Navigate to={target} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const f = new FormData(e.currentTarget as HTMLFormElement);
    const username = String(f.get("username") ?? "");
    const password = String(f.get("password") ?? "");

    window.logger?.info("[login] submit", { username });

    const ok = await login(username, password);
    setLoading(false);

    if (ok) {
      // อ่าน role ล่าสุดจาก localStorage ที่ AuthContext เซฟไว้
      let role: Role = "staff";
      try {
        const saved = JSON.parse(localStorage.getItem("auth_user") || "null");
        if (saved?.role) role = saved.role as Role;
      } catch {}

      const target = role === "admin" ? "/settings" : "/home";
      window.logger?.info("[login] success → navigate (by role)", { role, target });
      nav(target, { replace: true });
    } else {
      const msg = t("invalid_credentials");
      setErr(msg);
      window.logger?.warn("[login] failed", { username });
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-100 p-4">
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md bg-white p-8 rounded-2xl shadow text-center"
      >
        {/* ปุ่มเปลี่ยนภาษา มุมขวาบน */}
        <div className="absolute right-4 top-4">
          <LanguageSwitcher />
        </div>

        {/* โลโก้ */}
        <img
          src={logo}
          alt="Logo"
          className="w-32 h-auto mx-auto mb-4 select-none"
          draggable={false}
        />

        <h1 className="text-2xl font-semibold mb-4">{t("login_title")}</h1>

        <label className="block text-left">
          <span className="text-sm">{t("username")}</span>
          <input
            name="username"
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder={t("username_placeholder")}
          />
        </label>

        <label className="block text-left mt-3">
          <span className="text-sm">{t("password")}</span>
          <input
            name="password"
            type="password"
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder={t("password_placeholder")}
          />
        </label>

        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

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
