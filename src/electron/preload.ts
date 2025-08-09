// src/electron/preload.ts

import { contextBridge, ipcRenderer } from "electron";

function write(level: "debug" | "info" | "warn" | "error", args: any[]) {
  ipcRenderer.send("log:write", { level, args });
}

contextBridge.exposeInMainWorld("logger", {
  debug: (...a:any[]) => write("debug", a),
  info:  (...a:any[]) => write("info",  a),
  warn:  (...a:any[]) => write("warn",  a),
  error: (...a:any[]) => write("error", a),
});

contextBridge.exposeInMainWorld("api", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  updateConfig: (partial: any) => ipcRenderer.invoke("config:update", partial),

  // ตัวอย่าง auth จากก่อนหน้า
  register: (username: string, password: string, role?: string) =>
    ipcRenderer.invoke("auth:register", { username, password, role }),
  login: (username: string, password: string) =>
    ipcRenderer.invoke("auth:login", { username, password }),
  // ✅ เพิ่มสองตัวนี้
  getLogInfo: () => ipcRenderer.invoke("log:info"),
  openLogsFolder: () => ipcRenderer.invoke("log:open-folder"),  
});

contextBridge.exposeInMainWorld("devices", {
  getDevices: () => ipcRenderer.invoke("devices:get"),
  onUpdated: (handler: (list: any[]) => void) => {
    const wrapped = (_: unknown, payload: any[]) => handler(payload);
    ipcRenderer.on("devices:updated", wrapped);
    // คืน disposer ให้ถอด listener ได้
    return () => ipcRenderer.removeListener("devices:updated", wrapped);
  },
});

// Types (optional)
declare global {
  interface Window {
    logger?: {
      debug: (...args:any[]) => void;
      info:  (...args:any[]) => void;
      warn:  (...args:any[]) => void;
      error: (...args:any[]) => void;
    };
    api: {
      getConfig: () => Promise<{ ok: boolean; config: any; pathUsed: string }>;
      updateConfig: (p: any) => Promise<{ ok: boolean; config?: any; pathUsed?: string; error?: string }>;
      register: (u: string, p: string, r?: "admin"|"staff"|"maintenance") => Promise<{ ok: boolean; error?: string }>;
      login: (u: string, p: string) => Promise<{ ok: boolean; user?: { id:number; username:string; role:string }; error?: string }>;
      openLogsFolder: () => Promise<{ ok:boolean; logDir:string }>;
      getLogInfo: () => Promise<{ ok:boolean; minLevel:string; logFile:string; logDir:string }>;
    };
    devices?: {
      getDevices: () => Promise<{ ok: boolean; devices: any[]; path: string }>;
      onUpdated: (handler: (list: any[]) => void) => () => void;
    };
  }
}
export {};
