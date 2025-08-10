import { BrowserWindow, app, shell } from "electron";

import { initLogger } from "./logging";
import { loadConfig } from "./config";
import { openDB } from "./db";
import path from "path";
import { setupAuthIPC } from "./ipc/auth";
import { setupConfigIPC } from "./ipc/config";
import { setupDeviceIPC } from "./ipc/device";
import url from "url";

let win: BrowserWindow | null = null;
const getWindow = () => win;

function resolveDeviceFilePath(deviceCommunicationPath: string | undefined, configPathUsed: string) {
  if (!deviceCommunicationPath) return undefined;

  // baseDir: ถ้าอ่าน config จากไฟล์ ใช้โฟลเดอร์นั้น, ถ้าใช้ defaults → โปรเจกต์รูท (dist-electron/..)
  const baseDir =
    configPathUsed !== "(defaults)"
      ? path.dirname(configPathUsed)
      : path.join(__dirname, "..");

  const raw = path.isAbsolute(deviceCommunicationPath)
    ? deviceCommunicationPath
    : path.join(baseDir, deviceCommunicationPath);

  // ถ้าเป็นโฟลเดอร์ → เติมชื่อไฟล์มาตรฐาน
  const looksLikeDir =
    raw.endsWith(path.sep) ||
    !path.extname(raw) || // ไม่มีนามสกุล → น่าจะเป็นโฟลเดอร์
    // crude check: มีอยู่จริงและเป็น directory
    (require("fs").existsSync(raw) && require("fs").statSync(raw).isDirectory());

  return looksLikeDir ? path.join(raw, "device-communication.json") : raw;
}

function createWindow() {
  // ── Load config ───────────────────────────────────────────────────────────────
  const { config, pathUsed } = loadConfig();
  const isDev = config.environment === "development";

  // ── Init logger, DB, IPC ─────────────────────────────────────────────────────
  const logger = initLogger();
  const db = openDB(logger);

  setupAuthIPC(db);
  setupConfigIPC(logger);

  // deviceCommunicationPath → ไฟล์ JSON จริง
  const deviceFilePath = resolveDeviceFilePath(config.deviceCommunicationPath, pathUsed);
  setupDeviceIPC(getWindow, deviceFilePath);
  console.log("[main] debug deviceFile Path:", deviceFilePath);

  // ── Create BrowserWindow ──────────────────────────────────────────────────────
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

  // เปิดลิงก์ภายนอกด้วย browser
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

  // ── Load renderer (React) ─────────────────────────────────────────────────────
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

  // ── Diagnostics / Logging ─────────────────────────────────────────────────────
  win.webContents.on("did-fail-load", (_e, code, desc, theUrl) => {
    console.error("[did-fail-load]", code, desc, theUrl);
  });

  win.webContents.on("console-message", (_e, level, msg, line, sourceId) => {
    if (sourceId?.startsWith("devtools://")) return;
    console.log(`[renderer:${level}]`, msg, `@${sourceId}:${line}`);
  });

  win.on("unresponsive", () => console.error("[window] unresponsive"));

  win.once("ready-to-show", () => {
    if (win && !win.isDestroyed()) {
      win.show();
    }
  });

  win.on("closed", () => {
    win = null;
  });

  console.log("[app] ready");
}

// ── Single-instance lock ────────────────────────────────────────────────────────
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
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
