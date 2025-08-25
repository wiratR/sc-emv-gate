// src/electron/logging.ts

import fs from "fs";
import path from "path";
import { ipcMain, shell } from "electron";
import { loadConfig, type LogLevel } from "./config";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

let minLevel: LogLevel = "info";
let logDir = "";
let logFile = "";
let currentYMD = "";

// ─ New: กัน init ซ้ำ + เก็บ API ไว้คืน
let loggerInitialized = false;
let loggerApi: {
  refresh: () => void;
  getInfo: () => { minLevel: LogLevel; logFile: string; logDir: string };
  debug: (...args: any[]) => void;
  info:  (...args: any[]) => void;
  warn:  (...args: any[]) => void;
  error: (...args: any[]) => void;
} | null = null;

// ───────────────────────── helpers (LOCAL time) ─────────────────────────
function pad2(n: number) { return String(n).padStart(2, "0"); }
function pad3(n: number) { return String(n).padStart(3, "0"); }

/** YYYY-MM-DD (local date) */
function localYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

/** 2025-08-12T18:03:45.123+07:00 (local time) */
function formatLocalISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  const ms = pad3(d.getMilliseconds());

  const offsetMin = -d.getTimezoneOffset(); // +420 for +07:00
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const offH = pad2(Math.floor(abs / 60));
  const offM = pad2(abs % 60);

  return `${y}-${m}-${day}T${hh}:${mm}:${ss}.${ms}${sign}${offH}:${offM}`;
}

function shouldLog(level: LogLevel) {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

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

  currentYMD = localYmd(new Date());                            // ✅ ใช้ local date
  logFile = path.join(logDir, `${currentYMD}.log`);
  return { logDir, logFile, minLevel };
}

function cleanupOldLogs() {
  const { config } = loadConfig();
  const keepDays = Math.max(1, Number(config.logsRetentionDays || 14));
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - keepDays);

  try {
    for (const name of fs.readdirSync(logDir)) {
      if (!/^\d{4}-\d{2}-\d{2}\.log$/.test(name)) continue;
      // parse YYYY-MM-DD → local date
      const [y, m, d] = name.slice(0, 10).split("-").map((s) => Number(s));
      const fileDate = new Date(y, (m ?? 1) - 1, d ?? 1);
      fileDate.setHours(0, 0, 0, 0);
      if (fileDate < cutoff) {
        fs.unlinkSync(path.join(logDir, name));
      }
    }
  } catch {}
}

// — ตรวจวันใหม่ทุกครั้งก่อนเขียน เพื่อหมุนไฟล์รายวันแบบ live (ตาม local date)
function rollIfNewDay() {
  const ymdNow = localYmd(new Date());                          // ✅ ใช้ local date
  if (ymdNow !== currentYMD) {
    ensureLogTargets();
    cleanupOldLogs();
  }
}

// ─ helpers กันซ้ำสำหรับ IPC ─
function safeHandle(channel: string, handler: Parameters<typeof ipcMain.handle>[1]) {
  try { ipcMain.removeHandler(channel); } catch {}
  ipcMain.handle(channel, handler);
}
function safeOn(channel: string, listener: Parameters<typeof ipcMain.on>[1]) {
  ipcMain.removeAllListeners(channel);
  ipcMain.on(channel, listener);
}

export function initLogger() {
  // ✅ กันซ้ำ: ถ้า init แล้ว ให้คืน API เดิม
  if (loggerInitialized && loggerApi) return loggerApi;
  loggerInitialized = true;

  ensureLogTargets();
  cleanupOldLogs();

  const write = (level: LogLevel, from: "main" | "renderer", args: any[]) => {
    if (!shouldLog(level)) return;
    rollIfNewDay();
    try { fs.mkdirSync(logDir, { recursive: true }); } catch {}
    const ts = formatLocalISO(new Date());                      // ✅ local timestamp
    const msg = args.map(safeStringify).join(" ");
    fs.appendFileSync(logFile, `[${ts}] [${level.toUpperCase()}] [${from}] ${msg}\n`);
  };

  // — override console ของ main (ทำครั้งเดียวพอ)
  const origLog = console.log;
  const origWarn = console.warn;
  const origErr = console.error;

  console.log  = (...args: any[]) => { write("info",  "main", args); origLog(...args); };
  console.warn = (...args: any[]) => { write("warn",  "main", args); origWarn(...args); };
  console.error= (...args: any[]) => { write("error", "main", args); origErr(...args); };

  // — ให้ renderer ส่ง log เข้ามา (safe)
  safeOn("log:write", (_e, payload: { level: LogLevel; args: any[] }) => {
    const level = (payload?.level as LogLevel) || "info";
    if (!["debug", "info", "warn", "error"].includes(level)) return;
    write(level, "renderer", payload?.args || []);
  });

  // — เปิดโฟลเดอร์ log (safe)
  safeHandle("log:open-folder", async () => {
    ensureLogTargets();
    await shell.openPath(logDir);
    return { ok: true, logDir };
  });

  // — ส่งสถานะ logger (safe)
  safeHandle("log:info", async () => {
    ensureLogTargets();
    return { ok: true, minLevel, logFile, logDir };
  });

  // — ใช้เมื่อ config ถูกอัปเดต
  const refresh = () => { ensureLogTargets(); cleanupOldLogs(); };

  loggerApi = {
    refresh,
    getInfo: () => ({ minLevel, logFile, logDir }),
    debug: (...args: any[]) => write("debug", "main", args),
    info:  (...args: any[]) => write("info",  "main", args),
    warn:  (...args: any[]) => write("warn",  "main", args),
    error: (...args: any[]) => write("error", "main", args),
  };

  return loggerApi;
}
