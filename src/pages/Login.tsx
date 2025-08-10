// src/pages/Login.tsx
import { FormEvent, useEffect, useState } from "react";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import LogoSVG from "@/assets/logo.svg?react";
import { useAuth } from "@/auth/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import { useNavigate } from "react-router-dom";

type Role = "admin" | "staff" | "maintenance";

export default function Login() {
  const { user, login } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [remember, setRemember] = useState(false);

  // ถ้าล็อกอินอยู่แล้ว → เด้งด้วย effect (ไม่ใช้ <Navigate/>)
  useEffect(() => {
    if (user) {
      const target = user.role === "admin" ? "/settings" : "/home";
      window.logger?.info("[login] already logged-in → navigate (by role)", { role: user.role, target });
      const id = setTimeout(() => nav(target, { replace: true }), 0);
      return () => clearTimeout(id);
    }
  }, [user, nav]);

  // เดินทางแบบกันชน: ใช้ router + บังคับ hash ถ้าไม่ขยับ
  const go = (target: string) => {
    nav(target, { replace: true });
    setTimeout(() => {
      if (!location.hash.endsWith(target)) {
        window.location.hash = `#${target}`;
      }
    }, 30);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setLoading(true);

    const f = new FormData(e.currentTarget as HTMLFormElement);
    const username = String(f.get("username") ?? "").trim();
    const password = String(f.get("password") ?? "");

    window.logger?.info("[login] submit", { username, remember });
    const res = await login(username, password, remember);
    setLoading(false);

    if (res.ok && res.user) {
      const role: Role = res.user.role as Role;
      const target = role === "admin" ? "/settings" : "/home";
      window.logger?.info("[login] success → navigate (by role)", { role, target });
      go(target);
    } else {
      setErr(t("invalid_credentials"));
      window.logger?.warn("[login] failed", { username });
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-100 p-4">
      <form onSubmit={onSubmit} className="relative w-full max-w-md bg-white p-8 rounded-2xl shadow text-center" autoComplete="on">
        <div className="absolute right-4 top-4"><LanguageSwitcher /></div>
        <LogoSVG className="w-32 h-auto mx-auto mb-4 select-none" />
        <h1 className="text-2xl font-semibold mb-4">{t("login_title")}</h1>

        <label className="block text-left">
          <span className="text-sm">{t("username")}</span>
          <input name="username" required autoFocus autoComplete="username"
                 className="mt-1 w-full rounded-lg border px-3 py-2"
                 placeholder={t("username_placeholder")} />
        </label>

        <label className="block text-left mt-3">
          <span className="text-sm">{t("password")}</span>
          <input name="password" required type="password" autoComplete="current-password"
                 className="mt-1 w-full rounded-lg border px-3 py-2"
                 placeholder={t("password_placeholder")} />
        </label>

        <label className="mt-4 flex items-center gap-2 text-sm select-none">
          <input type="checkbox" className="h-4 w-4"
                 checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>Remember me</span>
        </label>

        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

        <button disabled={loading}
                className="mt-5 w-full rounded-lg bg-blue-600 text-white py-2 hover:bg-blue-700 disabled:opacity-60">
          {loading ? t("signing_in") : t("login")}
        </button>
      </form>
    </div>
  );
}
