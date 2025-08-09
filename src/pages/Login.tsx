// src/pages/Login.tsx
import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import logo from "@/assets/logo.svg";
import { useAuth } from "@/auth/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const { login } = useAuth();
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const f = new FormData(e.currentTarget as HTMLFormElement);
    const u = String(f.get("username") ?? "");
    const p = String(f.get("password") ?? "");
    const ok = await login(u, p);

    setLoading(false);

    if (ok) {
      const backTo = loc.state?.from?.pathname || "/home";
      nav(backTo, { replace: true });
    } else {
      setErr(t("invalid_credentials"));
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-100 p-4">
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md bg-white p-8 rounded-2xl shadow text-center"
      >
        {/* ปุ่มเลือกภาษา */}
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
