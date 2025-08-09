// src/electron/logging.ts

import fs from "fs";
import path from "path";
import { ipcMain, shell } from "electron";
import { loadConfig, type LogLevel } from "./config";

const LEVEL_ORDER: Record<LogLevel, number> = { debug:10, info:20, warn:30, error:40 };

let minLevel: LogLevel = "info";
let logDir = "";
let logFile = "";
let currentYMD = "";

function shouldLog(level: LogLevel) {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function ymd(d: Date) { return d.toISOString().slice(0,10); }

// — stringify ปลอดภัย + รองรับ Error
function safeStringify(v: any): string {
  if (v instanceof Error) {
    return v.stack ? `${v.name}: ${v.message}\n${v.stack}` : `${v.name}: ${v.message}`;
  }
  if (typeof v === "string") return v;
  try {
    const seen = new WeakSet();
    return JSON.stringify(v, (_k, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      return val;
    });
  } catch {
    return String(v);
  }
}

function ensureLogTargets() {
  const { config, pathUsed } = loadConfig();
  minLevel = config.logLevel || "info";

  const baseDir = pathUsed !== "(defaults)" ? path.dirname(pathUsed) : process.cwd();
  logDir = path.isAbsolute(config.logsPath) ? config.logsPath : path.join(baseDir, config.logsPath);

  fs.mkdirSync(logDir, { recursive: true });

  currentYMD = ymd(new Date());
  logFile = path.join(logDir, `${currentYMD}.log`);
  return { logDir, logFile, minLevel };
}

function cleanupOldLogs() {
  const { config } = loadConfig();
  const keepDays = Math.max(1, Number(config.logsRetentionDays || 14));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);

  try {
    for (const name of fs.readdirSync(logDir)) {
      if (!name.endsWith(".log")) continue;
      const datePart = name.slice(0, 10);
      const d = new Date(datePart);
      if (isFinite(+d) && d < cutoff) {
        fs.unlinkSync(path.join(logDir, name));
      }
    }
  } catch {}
}

// — ตรวจวันใหม่ทุกครั้งก่อนเขียน เพื่อหมุนไฟล์รายวันแบบ live
function rollIfNewDay() {
  const now = new Date();
  const ymdNow = ymd(now);
  if (ymdNow !== currentYMD) {
    ensureLogTargets();
    cleanupOldLogs();
  }
}

export function initLogger() {
  ensureLogTargets();
  cleanupOldLogs();

  const write = (level: LogLevel, from: "main" | "renderer", args: any[]) => {
    if (!shouldLog(level)) return;
    rollIfNewDay(); // ✅ หมุนไฟล์เมื่อวันเปลี่ยน
    try { fs.mkdirSync(logDir, { recursive: true }); } catch {}
    const ts = new Date().toISOString();
    const msg = args.map(safeStringify).join(" ");
    fs.appendFileSync(logFile, `[${ts}] [${level.toUpperCase()}] [${from}] ${msg}\n`);
  };

  // — override console ของ main
  const origLog = console.log;
  const origWarn = console.warn;
  const origErr = console.error;

  console.log  = (...args:any[]) => { write("info","main",args);  origLog(...args); };
  console.warn = (...args:any[]) => { write("warn","main",args);  origWarn(...args); };
  console.error= (...args:any[]) => { write("error","main",args); origErr(...args); };

  // — ให้ renderer ส่ง log เข้ามา
  ipcMain.on("log:write", (_e, payload: { level: LogLevel; args: any[] }) => {
    const level = payload?.level || "info";
    if (!["debug","info","warn","error"].includes(level)) return;
    write(level as LogLevel, "renderer", payload.args || []);
  });

  // — เปิดโฟลเดอร์ log
  ipcMain.handle("log:open-folder", async () => {
    ensureLogTargets();
    await shell.openPath(logDir);
    return { ok: true, logDir };
  });

  // — ส่งสถานะ logger
  ipcMain.handle("log:info", async () => {
    ensureLogTargets();
    return { ok: true, minLevel, logFile, logDir };
  });

  // — ใช้เมื่อ config ถูกอัปเดต
  const refresh = () => { ensureLogTargets(); cleanupOldLogs(); };

  // — เผื่ออยากใช้ logger ตรง ๆ ไม่ผ่าน console
  const api = {
    debug: (...args:any[]) => write("debug","main",args),
    info:  (...args:any[]) => write("info","main",args),
    warn:  (...args:any[]) => write("warn","main",args),
    error: (...args:any[]) => write("error","main",args),
  };

  return { refresh, getInfo: () => ({ minLevel, logFile, logDir }), ...api };
}
