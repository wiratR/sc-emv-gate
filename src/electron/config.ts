// src/electron/config.ts
import { app } from "electron";
import fs from "fs";
import path from "path";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type StationName =
  | string
  | { en?: string; th?: string };

export type AppConfig = {
  databasePath: string;
  logsPath: string;
  logLevel: LogLevel;
  logsRetentionDays: number;
  environment: "development" | "production";
  deviceCommunicationPath?: string;

  // Station / Display
  stationIp?: string;
  stationName?: StationName;
  stationId?: string;
  fullScreen?: boolean;

  // ✅ ใหม่: พอร์ตสำหรับรับ Heartbeat
  heartbeatPort?: number;
};

const DEFAULTS: AppConfig = {
  databasePath: "./database/app.sqlite",
  logsPath: "./logs",
  logLevel: "info",
  logsRetentionDays: 14,
  environment: "production",
  stationName: "",
  stationId: "",
  stationIp: "",
  deviceCommunicationPath: "./data",
  fullScreen: false,

  // ✅ ดีฟอลต์ 3070
  heartbeatPort: 3070,
};

let cached: AppConfig | undefined;
let cachedPath = "";

function resolveCandidatePaths() {
  const userDataCfg = path.join(app.getPath("userData"), "config.json");
  const resourceCfg = path.join(process.resourcesPath || "", "config.json");
  const devCfg = path.join(__dirname, "../config.json");
  return [userDataCfg, resourceCfg, devCfg];
}

export function resolveStationName(
  name: StationName | undefined,
  lang: "en" | "th"
): string {
  if (!name) return "";
  if (typeof name === "string") return name;
  return name[lang] ?? name.en ?? name.th ?? "";
}

export function loadConfig(): { config: AppConfig; pathUsed: string } {
  if (cached) return { config: cached, pathUsed: cachedPath };

  let loaded: Partial<AppConfig> = {};
  let used = "";

  for (const p of resolveCandidatePaths()) {
    try {
      if (fs.existsSync(p)) {
        loaded = JSON.parse(fs.readFileSync(p, "utf-8"));
        used = p;
        break;
      }
    } catch {}
  }

  const merged: AppConfig = { ...DEFAULTS, ...loaded };
  cached = merged;
  cachedPath = used || "(defaults)";
  return { config: merged, pathUsed: cachedPath };
}

export function updateConfig(newCfg: Partial<AppConfig>) {
  const { config: current } = loadConfig();
  const merged: AppConfig = { ...current, ...newCfg };

  const userCfgPath = path.join(app.getPath("userData"), "config.json");
  fs.mkdirSync(path.dirname(userCfgPath), { recursive: true });
  fs.writeFileSync(userCfgPath, JSON.stringify(merged, null, 2));

  cached = merged;
  cachedPath = userCfgPath;
  return { config: merged, pathUsed: userCfgPath };
}
