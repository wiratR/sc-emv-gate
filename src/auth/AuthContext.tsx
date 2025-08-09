// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

type User = { username: string } | null;
type AuthCtx = {
  user: User;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    const raw = localStorage.getItem("auth_user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const login = async (u: string, p: string) => {
    // TODO: เรียก API จริงภายหลัง
    const ok = u.trim() !== "" && p === "1234";
    if (ok) {
      const val = { username: u };
      setUser(val);
      localStorage.setItem("auth_user", JSON.stringify(val));
    }
    return ok;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
};
