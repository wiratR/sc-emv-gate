import { app } from "electron";
// src/electron/config.ts
import fs from "fs";
import path from "path";

export type AppConfig = {
  databasePath: string;
};

const DEFAULTS: AppConfig = {
  databasePath: "./database/app.sqlite",
};

let cached: AppConfig | null = null;
let cachedPath = "";

function resolveCandidatePaths() {
  // ลำดับค้นหา: userData/config.json → resources/config.json (prod) → ../config.json (dev)
  const userDataCfg = path.join(app.getPath("userData"), "config.json");
  const resourceCfg = path.join(process.resourcesPath || "", "config.json");
  const devCfg = path.join(__dirname, "../config.json");
  return [userDataCfg, resourceCfg, devCfg];
}

export function loadConfig(): { config: AppConfig; pathUsed: string } {
  if (cached) return { config: cached, pathUsed: cachedPath };

  const candidates = resolveCandidatePaths();
  let foundPath = "";
  let loaded: Partial<AppConfig> = {};

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        loaded = JSON.parse(raw);
        foundPath = p;
        break;
      }
    } catch {
      // ข้ามไฟล์เสีย
    }
  }

  cached = { ...DEFAULTS, ...loaded };
  cachedPath = foundPath || "(defaults)";
  return { config: cached, pathUsed: cachedPath };
}

export function updateConfig(newCfg: Partial<AppConfig>) {
  const { config } = loadConfig();
  const merged = { ...config, ...newCfg };
  // บันทึกลง userData/config.json เสมอ
  const userCfgPath = path.join(app.getPath("userData"), "config.json");
  fs.mkdirSync(path.dirname(userCfgPath), { recursive: true });
  fs.writeFileSync(userCfgPath, JSON.stringify(merged, null, 2));
  cached = merged;
  cachedPath = userCfgPath;
  return { config: merged, pathUsed: userCfgPath };
}
