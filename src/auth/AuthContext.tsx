// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

type Role = "admin" | "staff" | "maintenance";
type User = { username: string; role: Role } | null;

type AuthCtx = {
  user: User;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);

  // restore จาก localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("auth_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed);
        window.logger?.info("[auth] restored session", { username: parsed?.username, role: parsed?.role });
      } else {
        window.logger?.debug("[auth] no stored session");
      }
    } catch (e) {
      window.logger?.warn("[auth] failed to restore session", e);
    }
  }, []);

  const login = async (username: string, password: string) => {
    window.logger?.info("[auth] login attempt", {
      username,
      channel: window.api?.login ? "ipc" : "web-fallback",
    });

    // Electron (IPC) path
    if (typeof window !== "undefined" && window.api?.login) {
      try {
        const res = await window.api.login(username, password);
        if (res.ok && res.user) {
          const u: User = { username: res.user.username, role: res.user.role as Role };
          setUser(u);
          localStorage.setItem("auth_user", JSON.stringify(u));
          window.logger?.info("[auth] login success", { username: u.username, role: u.role });
          return true;
        }
        window.logger?.warn("[auth] login failed (ipc)", { username, reason: res.error || "invalid" });
        return false;
      } catch (e) {
        window.logger?.error("[auth] login error (ipc)", e);
        return false;
      }
    }

    // Web fallback (dev only)
    const ok = username.trim() !== "" && password === "1234";
    if (ok) {
      const u: User = { username, role: "staff" };
      setUser(u);
      localStorage.setItem("auth_user", JSON.stringify(u));
      window.logger?.warn("[auth] login via web-fallback (dev)", { username, role: u.role });
      return true;
    }
    window.logger?.warn("[auth] login failed (web-fallback)", { username });
    return false;
  };

  const logout = () => {
    const uname = user?.username;
    setUser(null);
    localStorage.removeItem("auth_user");
    window.logger?.info("[auth] logout", { username: uname });
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
};
