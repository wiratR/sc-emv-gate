// src/electron/main.ts
import { BrowserWindow, app, ipcMain, session, shell } from "electron";

import { initLogger } from "./logging";
import { loadConfig } from "./config";
import { openDB } from "./db";
import path from "path";
import { setupAuthIPC } from "./ipc/auth";
import { setupConfigIPC } from "./ipc/config";
import { setupDeviceIPC } from "./ipc/device";
import { setupTerminalIPC } from "./ipc/terminal";
import url from "url";

let win: BrowserWindow | null = null;
const getWindow = () => win;

/** แปลง deviceCommunicationPath → path ของไฟล์ JSON จริง (ถ้าเป็นโฟลเดอร์จะเติม device-communication.json ให้) */
function resolveDeviceFilePath(deviceCommunicationPath: string | undefined, configPathUsed: string) {
  if (!deviceCommunicationPath) return undefined;

  const baseDir =
    configPathUsed !== "(defaults)"
      ? path.dirname(configPathUsed)
      : path.join(__dirname, ".."); // dist-electron/.. (proj root ตอนแพ็ก)

  const raw = path.isAbsolute(deviceCommunicationPath)
    ? deviceCommunicationPath
    : path.join(baseDir, deviceCommunicationPath);

  const fs = require("fs") as typeof import("fs");
  const looksLikeDir =
    raw.endsWith(path.sep) ||
    !path.extname(raw) ||
    (fs.existsSync(raw) && fs.statSync(raw).isDirectory());

  return looksLikeDir ? path.join(raw, "device-communication.json") : raw;
}

/** ล้าง session/caches ของ Chromium */
async function clearAppSession() {
  const ses = session.defaultSession;
  await ses.clearStorageData({
    storages: [
      // "appcache",
      "cookies",
      "filesystem",
      "indexdb",
      "localstorage",
      "shadercache",
      "websql",
      "serviceworkers",
      "cachestorage",
    ],
  });
  await ses.clearCache();
  console.log("[main] Cleared session data");
}

/** ให้ renderer สั่งล้าง session ได้ */
ipcMain.handle("clear-session", async () => {
  try {
    await clearAppSession();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
});

async function createWindow() {
  // ── Load config ──────────────────────────────────────────────
  const { config, pathUsed } = loadConfig();
  const isDev = config.environment === "development";

  // ── Init logger, DB, IPC ─────────────────────────────────────
  const logger = initLogger();
  const db = openDB(logger);

  setupAuthIPC(db);
  setupConfigIPC(logger);

  // deviceCommunicationPath → ไฟล์ JSON จริง & ตั้ง IPC ของ devices
  const deviceFilePath = resolveDeviceFilePath(config.deviceCommunicationPath, pathUsed);
  setupDeviceIPC(getWindow, deviceFilePath);
  setupTerminalIPC();
  console.log("[main] debug deviceFile Path:", deviceFilePath);

  // ✅ กันพลาดใน dev: ล้างเศษ session ก่อนสร้างหน้าต่าง
  if (isDev) {
    await clearAppSession();
  }

  // ── Create BrowserWindow ─────────────────────────────────────
  win = new BrowserWindow({
    width: 1100,
    height: 800,
    show: false,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // เปิดลิงก์ภายนอกด้วย default browser
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:\/\//i.test(target)) {
      shell.openExternal(target);
      return { action: "deny" };
    }
    return { action: "deny" };
  });

  // กัน will-navigate ออกนอก origin ที่อนุญาต
  win.webContents.on("will-navigate", (e, targetUrl) => {
    const allowedDev = "http://localhost:5173/";
    const allowedProdPrefix = "file://";
    const ok =
      (isDev && targetUrl.startsWith(allowedDev)) ||
      (!isDev && targetUrl.startsWith(allowedProdPrefix));
    if (!ok) e.preventDefault();
  });

  // ── Load renderer (React) ────────────────────────────────────
  if (isDev) {
    console.log("[config] Loaded from:", pathUsed);
    console.log("[config] environment =", config.environment);
    console.log("[config] databasePath =", config.databasePath);
    console.log("[config] logsPath =", config.logsPath);
    if (config.stationName || config.stationId)
      console.log("[config] station =", config.stationName ?? "", config.stationId ?? "");
    if (config.stationIp) console.log("[config] stationIp =", config.stationIp);
    if (deviceFilePath) console.log("[config] deviceFilePath =", deviceFilePath);

    console.log("[env] Dev mode → http://localhost:5173/#/login");
    win.loadURL("http://localhost:5173/#/login");
    // win.webContents.openDevTools({ mode: "detach" });
  } else {
    console.log("[env] Prod mode → load index.html");
    const indexPath = url
      .pathToFileURL(path.join(__dirname, "../dist/index.html"))
      .toString();
    win.loadURL(indexPath);
  }

  // ── Diagnostics / Logging ────────────────────────────────────
  win.webContents.on("did-fail-load", (_e, code, desc, theUrl) => {
    console.error("[did-fail-load]", code, desc, theUrl);
  });

  win.webContents.on("console-message", (_e, level, msg, line, sourceId) => {
    if (sourceId?.startsWith("devtools://")) return; // ตัด log ภายใน DevTools เอง
    console.log(`[renderer:${level}]`, msg, `@${sourceId}:${line}`);
  });

  win.on("unresponsive", () => console.error("[window] unresponsive"));

  win.once("ready-to-show", () => {
    if (win && !win.isDestroyed()) win.show();
  });

  win.on("closed", () => {
    win = null;
  });

  console.log("[app] ready");
}

// ── Single-instance lock ───────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const w = getWindow();
    if (w) {
      if (w.isMinimized()) w.restore();
      w.focus();
    }
  });

  app.whenReady().then(() => {
    void createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  // ✅ เคลียร์ session/caches อัตโนมัติก่อนปิดแอปทุกครั้ง
  app.on("before-quit", async () => {
    try {
      await clearAppSession();
    } catch (err) {
      console.error("[main] Failed to clear session data:", err);
    }
  });
}
