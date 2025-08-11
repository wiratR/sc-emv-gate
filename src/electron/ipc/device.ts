// src/electron/ipc/device.ts

import { BrowserWindow, ipcMain } from "electron";

import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

export type DeviceStatus = "online" | "offline" | "fault" | "maintenance";
export type Device = {
  id: string;
  gateId?: string;
  name: string;
  side: "north" | "south";
  type?: string;
  status: DeviceStatus;
  lastHeartbeat?: string;
  message?: string;
  deviceIp?: string;
};

let filePath = "";
let cache: Device[] = [];
let watching = false;

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
function safeReadDevices(jsonPath: string): Device[] {
  try {
    ensureFileExists(jsonPath);
    const raw = fs.readFileSync(jsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Device[];
    console.warn("[devices] parsed JSON is not array");
  } catch (e) {
    console.error("[devices] read error:", e);
  }
  return [];
}

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
    // เด้ง cmd ใหม่แล้วรัน ssh
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

export function setupDeviceIPC(getWindow: () => BrowserWindow | null, customFilePath?: string) {
  filePath = customFilePath || filePath;
  console.log("[devices] setup, file =", filePath);

  // initial load
  if (filePath) cache = safeReadDevices(filePath);

  // === IPC handlers (ลงทะเบียนที่นี่ทั้งหมด) ===
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

  // file watcher
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
      }, 80);
    });
  }
}
