import { BrowserWindow, ipcMain } from "electron";

import fs from "fs";
import path from "path";

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
};

let filePath = "";
let cache: Device[] = [];
let watching = false;

function ensureDirExists(p: string) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch {}
}

function ensureFileExists(jsonPath: string) {
  const dir = path.dirname(jsonPath);
  ensureDirExists(dir);

  if (!fs.existsSync(jsonPath)) {
    try {
      fs.writeFileSync(jsonPath, "[]", "utf-8");
      console.log(`[devices] created empty file: ${jsonPath}`);
    } catch (e) {
      console.error("[devices] cannot create file:", e);
    }
  }
}

function safeReadDevices(jsonPath: string): Device[] {
  try {
    ensureFileExists(jsonPath);

    const raw = fs.readFileSync(jsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    console.warn("[devices] parsed JSON is not array");
  } catch (e) {
    console.error("[devices] read error:", e);
  }
  return [];
}

export function setupDeviceIPC(getWindow: () => BrowserWindow | null, customFilePath?: string) {
  filePath = customFilePath || filePath;

  // initial load
  cache = safeReadDevices(filePath);

  // renderer pull
  ipcMain.handle("devices:get", () => {
    return { ok: true, devices: cache, path: filePath };
  });

  // watch changes
  if (!watching && filePath) {
    watching = true;
    const dir = path.dirname(filePath);
    const name = path.basename(filePath);

    try {
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
    } catch (e) {
      console.error("[devices] watch error:", e);
    }
  }
}
