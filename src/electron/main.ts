// src/electron/main.ts

import { BrowserWindow, app, ipcMain, session, shell } from "electron";
import path from "path";

import { loadConfig, resolveStationName } from "./config";
import { initLogger } from "./logging";
import { openDB } from "./db";

import { setupAuthIPC } from "./ipc/auth";
import { setupConfigIPC } from "./ipc/config";
import { setupDeviceIPC } from "./ipc/device";
import { setupTerminalIPC } from "./ipc/terminal";
import { setupUsersIPC } from "./ipc/user";

import { startHeartbeatServerFromConfig, type HeartbeatServer } from "./heartbeatServer";
import { setHeartbeatServerRef } from "./main-hb-ref";

// ───────────────── Global error guards ─────────────────
process.on("unhandledRejection", (e) => {
  try { require("electron-log").error(e); } catch { console.error(e); }
});
process.on("uncaughtException", (e) => {
  try { require("electron-log").error(e); } catch { console.error(e); }
});

// ───────────────── State ─────────────────
let hbServer: HeartbeatServer | null = null;
let win: BrowserWindow | null = null;
const getWindow = () => win;

// ───────────────── Utils ─────────────────
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

// ให้ renderer สั่งล้าง session ได้ (ลงทะเบียนครั้งเดียว)
ipcMain.handle("clear-session", async () => {
  try {
    await clearAppSession();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
});

// ───────────────── Window ─────────────────
async function createWindow() {
  console.log("[env] isPackaged =", app.isPackaged,
            "defaultApp =", !!(process as any).defaultApp,
            "execPath =", process.execPath);
  console.log("[env] appName =", app.getName(),
              "userData =", app.getPath("userData"));
  // โหลด config เฉพาะที่ต้องใช้กับหน้าต่าง (อย่าใช้เพื่อเลือก dev/prod)
  const { config, pathUsed } = loadConfig();
  const isDev = !app.isPackaged; // ✅ ใช้สถานะจริงของแอป

  // ข้อมูลสถานี/ไฟล์ device เพื่อ log
  const deviceFilePath = resolveDeviceFilePath(config.deviceCommunicationPath, pathUsed);
  const stationNameEN = resolveStationName(config.stationName, "en");

  if (isDev) {
    await clearAppSession(); // กัน cache เก่า ๆ ตอนพัฒนา
  }

  win = new BrowserWindow({
    width: 1100,
    height: 800,
    fullscreen: !!config.fullScreen,
    autoHideMenuBar: !!config.fullScreen,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false, // show เมื่อ ready-to-show เพื่อลดจอฟ้า/ดำวาบ
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

  // Log ข้อมูลมีประโยชน์
  console.log("[DB] Loading config from:", pathUsed !== "(defaults)" ? pathUsed : "(defaults)");
  if (config.stationName || config.stationId) {
    console.log("[config] station =", stationNameEN || "", config.stationId ?? "");
  }
  if (config.stationIp) console.log("[config] stationIp =", config.stationIp);
  if (deviceFilePath) console.log("[config] deviceFilePath =", deviceFilePath);
  if (config.fullScreen) console.log("[config] fullScreen =", config.fullScreen);

  // โหลด UI
  if (isDev) {
    console.log("[env] Dev mode → http://localhost:5173/#/login");
    await win.loadURL("http://localhost:5173/#/login");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    console.log("[env] Prod mode → load index.html");
    const indexHtmlPath = path.join(__dirname, "../dist/index.html");
    await win.loadFile(indexHtmlPath, { hash: "/login" }); // ใช้ HashRouter
    //win.webContents.openDevTools({ mode: "detach" });
  }

  // Diagnostics / Logging
  win.webContents.on("did-fail-load", async (_e, code, desc, failingUrl) => {
    console.error("[did-fail-load]", code, desc, failingUrl);
    if (!win?.isDestroyed() && isDev && failingUrl?.startsWith("http://localhost:5173")) {
      const indexHtmlPath = path.join(__dirname, "../dist/index.html");
      console.log("[did-fail-load] dev server down → fallback to local file");
      await win?.loadFile(indexHtmlPath, { hash: "/login" });
    }
  });

  win.webContents.on("console-message", (_e, level, msg, line, sourceId) => {
    if (sourceId?.startsWith("devtools://")) return; // ตัด log ภายใน DevTools
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

// ───────────────── Single-instance ─────────────────
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
    // ✅ Init ส่วน global (ทำครั้งเดียว)
    const logger = initLogger();          // idempotent
    const db = openDB(logger);

    // โหลด config เพื่อคำนวณ deviceFilePath ให้ setupDeviceIPC
    const { config, pathUsed } = loadConfig();
    const deviceFilePath = resolveDeviceFilePath(config.deviceCommunicationPath, pathUsed);

    // ลงทะเบียน IPC ทั้งหมด "ครั้งเดียว"
    setupAuthIPC(db);
    setupConfigIPC(logger);
    setupUsersIPC(db, logger);
    setupTerminalIPC();
    setupDeviceIPC(getWindow, deviceFilePath);

    // เริ่ม Heartbeat server ตาม config
    hbServer = startHeartbeatServerFromConfig();
    setHeartbeatServerRef(hbServer);

    void createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  // เคลียร์ session/caches ก่อนปิดแอปทุกครั้ง
  app.on("before-quit", async () => {
    try { await clearAppSession(); } catch (err) {
      console.error("[main] Failed to clear session data:", err);
    }
    try { hbServer?.close(); } catch {}
    setHeartbeatServerRef(null);
  });
}
