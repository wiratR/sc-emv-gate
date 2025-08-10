// src/auth/AuthContext.tsx
import React, { createContext, useContext, useState } from "react";

type Role = "admin" | "staff" | "maintenance";
type User = { username: string; role: Role } | null;

type AuthCtx = {
  user: User;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ❌ ไม่อ่าน/เขียน localStorage → ไม่จำ session
  const [user, setUser] = useState<User>(null);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Electron (IPC) เท่านั้น
    if (typeof window !== "undefined" && window.api?.login) {
      try {
        const res = await window.api.login(username, password);
        if (res?.ok && res.user) {
          const u: User = { username: res.user.username, role: res.user.role as Role };
          setUser(u); // ✅ แค่อยู่ใน memory
          return true;
        }
        return false;
      } catch (e) {
        window.logger?.error?.("[auth] login error", e as any);
        return false;
      }
    }
    // ไม่มี IPC → ไม่รองรับ login บนเว็บ
    return false;
  };

  const logout = () => {
    if (user) window.logger?.info?.("[auth] logout", { username: user.username });
    setUser(null); // ✅ แค่ล้าง state ใน memory
    // ถ้ามี main process จัดการ token/อะไรเพิ่มเติม ให้เรียก window.api?.logout?.() ที่นี่ได้
    // window.api?.logout?.();
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
};
