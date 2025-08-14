// src/electron/ipc/device.ts

import { BrowserWindow, app, ipcMain } from "electron";

import fs from "fs";
import os from "os";
import path from "path";
import { probeTcp } from "./devices/probe";
import { spawn } from "child_process";

type RunResult = { code: number; stdout: string; stderr: string };

export type DeviceStatus = "online" | "offline" | "fault" | "maintenance";
export type Device = {
  id: string;
  gateId?: string;
  name?: string;
  side?: "north" | "south";
  type?: string;
  status?: DeviceStatus;
  lastHeartbeat?: string;
  message?: string;
  deviceIp?: string;
  // อาจโผล่มาจาก heartbeat/raw
  ip?: string;
  ts?: string;
};

let filePath = "";
let cache: Device[] = [];
let watching = false;

// ───────────────────────────────── helpers ─────────────────────────────────

function ensureDirExists(p: string) {
  try { fs.mkdirSync(p, { recursive: true }); } catch {}
}
function ensureFileExists(jsonPath: string) {
  const dir = path.dirname(jsonPath);
  ensureDirExists(dir);
  if (!fs.existsSync(jsonPath)) {
    fs.writeFileSync(jsonPath, "[]", "utf-8");
    console.log("[devices] created empty file:", jsonPath);
  }
}

/** รองรับ [], {devices: []}, และ object map */
function coerceDevices(data: any): Device[] {
  if (Array.isArray(data)) return data as Device[];
  if (data && Array.isArray((data as any).devices)) return (data as any).devices as Device[];
  if (data && typeof data === "object") return Object.values(data) as Device[];
  return [];
}

/** map ip->deviceIp, ts->lastHeartbeat, ใส่ status default */
function normalizeDeviceFields(d: Device): Device {
  const out: Device = { ...d };
  if (!out.deviceIp && out.ip) out.deviceIp = out.ip;
  if (!out.lastHeartbeat && out.ts) out.lastHeartbeat = out.ts;
  if (!out.status) out.status = "offline";
  return out;
}

function safeReadDevices(jsonPath: string): Device[] {
  try {
    ensureFileExists(jsonPath);
    const raw = fs.readFileSync(jsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    const list = coerceDevices(parsed).map(normalizeDeviceFields);
    return list;
  } catch (e) {
    console.error("[devices] read error:", e);
    return [];
  }
}

// ───────────────────────────────── SSH/Terminal ────────────────────────────

async function openSSHConsole(ip: string) {
  const platform = os.platform();
  if (platform === "darwin") {
    const script = `tell application "Terminal"
      activate
      do script "ssh ${ip}"
    end tell`;
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const p = spawn("osascript", ["-e", script]);
      p.on("error", (e) => resolve({ ok: false, error: String(e) }));
      p.on("close", (code) => resolve({ ok: code === 0, error: code ? `osascript exit ${code}` : undefined }));
    });
  }
  if (platform === "win32") {
    // เปิด cmd ใหม่แล้วรัน ssh
    spawn("cmd.exe", ["/c", "start", "cmd", "/k", `ssh ${ip}`], { windowsHide: false, detached: true });
    return { ok: true };
  }
  // Linux
  const tryCmds: [string, ...string[]][] = [
    ["x-terminal-emulator", "-e", `ssh ${ip}`],
    ["gnome-terminal", "--", "ssh", ip],
    ["konsole", "-e", "ssh", ip],
    ["xfce4-terminal", "-e", `ssh ${ip}`],
    ["xterm", "-e", `ssh ${ip}`],
  ];
  for (const [cmd, ...args] of tryCmds) {
    try {
      spawn(cmd, args, { detached: true });
      return { ok: true };
    } catch {}
  }
  return { ok: false, error: "No terminal found" };
}

// ───────────────────────────────── IPC setup ───────────────────────────────

export function setupDeviceIPC(getWindow: () => BrowserWindow | null, customFilePath?: string) {
  filePath = customFilePath || filePath;
  console.log("[devices] setup, file =", filePath);

  // initial load
  if (filePath) cache = safeReadDevices(filePath);

  // handlers
  ipcMain.handle("devices:get", () => {
    return { ok: true, devices: cache, path: filePath };
  });

  ipcMain.handle("devices:ssh", async (_e, ip: string) => {
    if (!ip) return { ok: false, error: "No IP" };
    console.log("[devices] ssh request", ip);
    return await openSSHConsole(ip);
  });

  ipcMain.handle("devices:reboot", async (_e, deviceId: string) => {
    try {
      console.log("[devices] reboot request", deviceId);
      // TODO: ต่อโปรโตคอลจริงของ Gate ที่นี่
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) };
    }
  });

  // file watcher (debounce เล็กน้อย กัน partial write)
  if (!watching && filePath) {
    watching = true;
    const dir = path.dirname(filePath);
    const name = path.basename(filePath);
    ensureDirExists(dir);
    fs.watch(dir, { persistent: true }, (_ev, changed) => {
      if (!changed || changed !== name) return;
      setTimeout(() => {
        cache = safeReadDevices(filePath);
        const win = getWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send("devices:updated", cache);
        }
      }, 120);
    });
  }
}

// ───────────────────────────────── Probe (TCP) ─────────────────────────────

ipcMain.handle("devices:probe", async (_e, payload: { host?: string; port?: number; timeoutMs?: number }) => {
  const host = payload?.host?.trim();
  if (!host) return { ok: false as const, error: "No host/IP provided" };
  try {
    const { reachable, rttMs } = await probeTcp(host, payload?.port ?? 22, payload?.timeoutMs ?? 1200);
    return { ok: true as const, reachable, rttMs };
  } catch (e: any) {
    return { ok: false as const, error: String(e?.message || e) };
  }
});

// ───────────────────────────────── Get Device Log ──────────────────────────

function run(cmd: string, args: string[], timeoutMs = 120_000): Promise<RunResult> {
  return new Promise((resolve) => {
    const ps = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const t = setTimeout(() => {
      try { ps.kill("SIGKILL"); } catch {}
    }, timeoutMs);

    ps.stdout.on("data", (d) => (stdout += String(d)));
    ps.stderr.on("data", (d) => (stderr += String(d)));
    ps.on("close", (code) => {
      clearTimeout(t);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

async function waitForRemoteFile(host: string, remotePath: string, timeoutMs = 90_000, intervalMs = 1_500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await run("ssh", [
      "-o", "BatchMode=yes",
      "-o", "StrictHostKeyChecking=no",
      "-o", "ConnectTimeout=8",
      host, "test", "-f", remotePath
    ], 10_000);
    if (r.code === 0) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

ipcMain.handle("devices:get-log", async (_e, args: { host?: string; remotePath?: string }) => {
  const host = args?.host?.trim();
  const remoteLog = args?.remotePath || "/tmp/log.tar.gz";
  if (!host) return { ok: false, error: "No host/IP provided" };

  // 1) trigger script ฝั่งปลายทาง
  const mk = await run("ssh", [
    "-o", "BatchMode=yes",
    "-o", "StrictHostKeyChecking=no",
    "-o", "ConnectTimeout=10",
    host, "bash", "-lc", "/afc/scripts/mklog.sh"
  ], 180_000);
  if (mk.code !== 0) {
    return { ok: false, error: `mklog failed: ${mk.stderr || mk.stdout || mk.code}` };
  }

  // 2) รอไฟล์โผล่
  const ok = await waitForRemoteFile(host, remoteLog, 120_000, 2_000);
  if (!ok) {
    return { ok: false, error: `Timeout waiting for ${remoteLog}` };
  }

  // 3) scp กลับมา
  const downloads = app.getPath("downloads");
  const outDir = path.join(downloads, "sc-emv-gate-logs");
  fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(outDir, `device-log-${host}-${ts}.tar.gz`);

  const cp = await run("scp", [
    "-o", "BatchMode=yes",
    "-o", "StrictHostKeyChecking=no",
    "-o", "ConnectTimeout=10",
    `${host}:${remoteLog}`, outPath
  ], 120_000);
  if (cp.code !== 0) {
    return { ok: false, error: `scp failed: ${cp.stderr || cp.stdout || cp.code}` };
  }

  // 4) ลบไฟล์ชั่วคราวปลายทาง (best-effort)
  run("ssh", [
    "-o", "BatchMode=yes",
    "-o", "StrictHostKeyChecking=no",
    "-o", "ConnectTimeout=8",
    host, "rm", "-f", remoteLog
  ]).catch(() => {});

  return { ok: true, path: outPath };
});
