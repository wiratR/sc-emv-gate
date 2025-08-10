// src/auth/AuthContext.tsx
import React, { createContext, useContext, useState } from "react";

type Role = "admin" | "staff" | "maintenance";
type User = { username: string; role: Role } | null;
type LoginResult = { ok: boolean; user?: Exclude<User, null> };

type AuthCtx = {
  user: User;
  login: (u: string, p: string, remember?: boolean) => Promise<LoginResult>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);

  const login = async (username: string, password: string, remember = false): Promise<LoginResult> => {
    try {
      if (typeof window !== "undefined" && window.api?.login) {
        const res = await window.api.login(username, password);
        if (res.ok && res.user) {
          const u = { username: res.user.username, role: res.user.role as Role };
          setUser(u);
          // remember → localStorage, ไม่งั้น sessionStorage (optional)
          try {
            const store = remember ? localStorage : sessionStorage;
            store.setItem("auth_user", JSON.stringify(u));
          } catch {}
          window.logger?.info?.("[auth] login success", { username: u.username, role: u.role });
          return { ok: true, user: u };
        }
        return { ok: false };
      }

      // (เว็บ fallback ถ้าจำเป็น)
      // const ok = username.trim() !== "" && password === "1234";
      // if (ok) {
      //   const u: Exclude<User, null> = { username, role: "staff" };
      //   setUser(u);
      //   (remember ? localStorage : sessionStorage).setItem("auth_user", JSON.stringify(u));
      //   return { ok: true, user: u };
      // }
      return { ok: false };
    } catch (e) {
      window.logger?.error?.("[auth] login error", e);
      return { ok: false };
    }
  };

  const logout = () => {
    if (user) window.logger?.info?.("[auth] logout", { username: user.username });
    setUser(null);
    try {
      localStorage.removeItem("auth_user");
      sessionStorage.removeItem("auth_user");
    } catch {}
    window.api?.clearSession?.().catch(() => {});
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
};
