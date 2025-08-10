// src/pages/Settings.tsx
import { useEffect, useState } from "react";

import Header from "@/components/Header";
import { useAuth } from "@/auth/AuthContext";

const LEVELS = ["debug", "info", "warn", "error"] as const;
type Level = typeof LEVELS[number];

export default function Settings() {
  const { user } = useAuth();
  const [level, setLevel] = useState<Level>("info");
  const [logDir, setLogDir] = useState("");
  const [logFile, setLogFile] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.logger?.info("[settings] mounted");
    (async () => {
      const cfg = await window.api?.getConfig();
      const info = await window.api?.getLogInfo();
      if (cfg?.ok) setLevel((cfg.config.logLevel || "info") as Level);
      if (info?.ok) { setLogDir(info.logDir); setLogFile(info.logFile); }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Settings</h1>

        <section className="mt-6 p-4 bg-white rounded-2xl border shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm">Log Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
              className="border rounded-lg px-3 py-2"
            >
              {LEVELS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <div>Log dir: <code>{logDir}</code></div>
            <div>Current file: <code>{logFile}</code></div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={async () => {
                setSaving(true);
                const res = await window.api?.updateConfig({ logLevel: level });
                setSaving(false);
                if (!res?.ok) alert(res?.error || "Save failed");
              }}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              onClick={async () => {
                const res = await window.api?.openLogsFolder();
                if (!res?.ok) alert("Cannot open logs folder");
              }}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50"
            >
              Open Logs Folder
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
