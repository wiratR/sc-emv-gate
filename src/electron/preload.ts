// src/electron/preload.ts

import { contextBridge, ipcRenderer } from "electron";

import type { Operation } from "./models/operations";

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
  clearSession: () => ipcRenderer.invoke("clear-session"),

  listUsers: () => ipcRenderer.invoke("users:list"),
  createUser: (payload: { username: string; password: string; role: "admin" | "staff" | "maintenance" }) =>
    ipcRenderer.invoke("users:create", payload),
  deleteUser: (username: string) => ipcRenderer.invoke("users:delete", username),
});

contextBridge.exposeInMainWorld("devices", {
  getDevices: () => ipcRenderer.invoke("devices:get"),
  onUpdated: (handler: (list: any[]) => void) => {
    const wrapped = (_: unknown, payload: any[]) => handler(payload);
    ipcRenderer.on("devices:updated", wrapped);
    // คืน disposer ให้ถอด listener ได้
    return () => ipcRenderer.removeListener("devices:updated", wrapped);
  },
  reboot: (deviceId: string) => ipcRenderer.invoke("devices:reboot", deviceId),
  openSSH: (ip: string) => ipcRenderer.invoke("devices:ssh", ip), 
  probe: (host: string, port?: number, timeoutMs?: number) =>
    ipcRenderer.invoke("devices:probe", { host, port, timeoutMs }) as Promise<
      { ok: true; reachable: boolean; rttMs: number } | { ok: false; error: string }
    >,
  getDeviceLog: (args: { host: string; remotePath?: string }) =>
    ipcRenderer.invoke("devices:get-log", args),
  getCurrentOperation: (deviceId: string) =>
    ipcRenderer.invoke("devices:get-current-operation", deviceId) as Promise<
      | { ok: true; operation: Operation | null }
      | { ok: false; error: string }
    >,
  setOperation: (...args: any[]) => {
    // รองรับ setOperation("G1-01","emergency") หรือ setOperation({deviceId:"G1-01",operation:"emergency"})
    const payload =
      typeof args[0] === "string"
        ? { deviceId: args[0], operation: args[1] }
        : (args[0] ?? {});
    try { console.log("[preload] setOperation ->", payload); } catch {}
    return ipcRenderer.invoke("devices:set-operation", payload);
  },
});

contextBridge.exposeInMainWorld("terminal", {
  create: (opts?: any) => ipcRenderer.invoke("terminal:create", opts),
  write: (id: string, data: string) => ipcRenderer.invoke("terminal:write", { id, data }),
  resize: (id: string, cols: number, rows: number) =>
    ipcRenderer.invoke("terminal:resize", { id, cols, rows }),
  kill: (id: string) => ipcRenderer.invoke("terminal:kill", { id }),
  onData: (cb: (_: any, p: { id: string; data: string }) => void) =>
    ipcRenderer.on("terminal:data", cb),
  offData: (cb: (_: any, p: { id: string; data: string }) => void) =>
    ipcRenderer.removeListener("terminal:data", cb),
  onExit: (cb: (_: any, p: { id: string; exitCode?: number; signal?: number }) => void) =>
    ipcRenderer.on("terminal:exit", cb),
  offExit: (cb: (_: any, p: { id: string; exitCode?: number; signal?: number }) => void) =>
    ipcRenderer.removeListener("terminal:exit", cb),
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
      clearSession: () => Promise<{ ok: boolean; error?: string }>;
    };
    devices?: {
      getDevices: () => Promise<{ ok: boolean; devices: any[]; path: string }>;
      onUpdated: (handler: (list: any[]) => void) => () => void;
    };
  }
}
export {};
