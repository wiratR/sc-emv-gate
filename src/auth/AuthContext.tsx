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
   const [user, setUser] = useState<User>(() => {
     if (typeof window !== "undefined") {
       try {
         return JSON.parse(localStorage.getItem("auth_user") || "null");
       } catch {
         return null;
       }
     }
     return null;
   });

  const login = async (username: string, password: string) => {
    if (typeof window !== "undefined" && window.api?.login) {
      try {
        const res = await window.api.login(username, password);
        if (res.ok && res.user) {
          const u: User = { username: res.user.username, role: res.user.role as Role };
          setUser(u);
          if (typeof window !== "undefined") {
            localStorage.setItem("auth_user", JSON.stringify(u));
          }
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }

    // Web fallback (dev only)
    const ok = username.trim() !== "" && password === "1234";
    if (ok) {
      const u: User = { username, role: "staff" };
      setUser(u);
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_user", JSON.stringify(u));
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_user");
    }
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
};
