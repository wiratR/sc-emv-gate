// src/pages/Home.tsx
import { useAuth } from "@/auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between px-6 h-14 border-b bg-white">
        <h1 className="font-semibold">sc-emv-gate</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Hello, {user?.username}</span>
          <button
            onClick={() => { logout(); nav("/login", { replace: true }); }}
            className="rounded-lg border px-3 py-1.5 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="p-6">
        <div className="p-5 bg-white rounded-2xl shadow">
          <h2 className="font-medium">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Welcome to EMV Gate</p>
        </div>
      </main>
    </div>
  );
}
