// src/electron/ipc/config.ts

import { loadConfig, updateConfig } from "../config";

import { ipcMain } from "electron";

type LoggerLike = { refresh: () => any };

export function setupConfigIPC(logger?: LoggerLike) {
  ipcMain.handle("config:get", () => {
    const { config, pathUsed } = loadConfig();
    return { ok: true, config, pathUsed };
  });

  ipcMain.handle("config:update", (_e, partial: any) => {
    try {
      const { config, pathUsed } = updateConfig(partial || {});
      logger?.refresh(); // อ่าน logsPath/logLevel/logsRetentionDays ใหม่
      return { ok: true, config, pathUsed };
    } catch {
      return { ok: false, error: "Failed to update config" };
    }
  });
}
