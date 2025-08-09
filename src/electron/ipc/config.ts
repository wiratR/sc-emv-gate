// src/electron/ipc/config.ts
import { loadConfig, updateConfig } from "../config";

import { ipcMain } from "electron";

export function setupConfigIPC() {
  ipcMain.handle("config:get", () => {
    const { config, pathUsed } = loadConfig();
    return { ok: true, config, pathUsed };
  });

  ipcMain.handle("config:update", (_e, partial: any) => {
    try {
      const { config, pathUsed } = updateConfig(partial || {});
      return { ok: true, config, pathUsed };
    } catch (e) {
      return { ok: false, error: "Failed to update config" };
    }
  });
}
