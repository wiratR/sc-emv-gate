// src/pages/Settings.tsx

import { useEffect, useState } from "react";

import { useAuth } from "@/auth/AuthContext";

const LEVELS = ["debug", "info", "warn", "error"] as const;
type Level = typeof LEVELS[number];

export default function Settings() {
  const { user, logout } = useAuth(); // ✅ เพิ่ม logout
  const [level, setLevel] = useState<Level>("info");
  const [logDir, setLogDir] = useState("");
  const [logFile, setLogFile] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.logger?.info("[renderer] Entered Settings page");

    (async () => {
      const cfg = await window.api?.getConfig();
      const info = await window.api?.getLogInfo();
      if (cfg?.ok) setLevel((cfg.config.logLevel || "info") as Level);
      if (info?.ok) {
        setLogDir(info.logDir);
        setLogFile(info.logFile);
      }
    })();
  }, []);

  const onSave = async () => {
    setSaving(true);
    const res = await window.api?.updateConfig({ logLevel: level });
    setSaving(false);
    if (!res?.ok) alert(res?.error || "Save failed");
  };

  const openFolder = async () => {
    const res = await window.api?.openLogsFolder();
    if (!res?.ok) alert("Cannot open logs folder");
  };

  if (user?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <div className="flex items-center gap-3">
          <span className="font-medium">{user?.username}</span>
          <button
            onClick={logout}
            className="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      <div className="max-w-2xl mx-auto p-4 bg-white rounded-2xl border shadow">
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm">Log Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
            className="border rounded-lg px-3 py-2"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <div>Log dir: <code>{logDir}</code></div>
          <div>Current file: <code>{logFile}</code></div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={openFolder}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Open Logs Folder
          </button>
        </div>
      </div>
    </div>
  );
}
