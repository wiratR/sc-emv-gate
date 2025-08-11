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
  clearSession: () => ipcRenderer.invoke("clear-session"),
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
});

contextBridge.exposeInMainWorld("terminal", {
  create: (opts?: { sshHost?: string; cols?: number; rows?: number; cwd?: string }) =>
    ipcRenderer.invoke("terminal:create", opts),
  write: (id: string, data: string) => ipcRenderer.send("terminal:write", id, data),
  resize: (id: string, cols: number, rows: number) => ipcRenderer.send("terminal:resize", id, cols, rows),
  kill: (id: string) => ipcRenderer.invoke("terminal:kill", id),

  onData: (id: string, cb: (chunk: string) => void) => {
    const ch = `terminal:data:${id}`;
    const fn = (_: any, data: string) => cb(data);
    ipcRenderer.on(ch, fn);
    return () => ipcRenderer.removeListener(ch, fn);
  },
  onExit: (id: string, cb: () => void) => {
    const ch = `terminal:exit:${id}`;
    const fn = () => cb();
    ipcRenderer.on(ch, fn);
    return () => ipcRenderer.removeListener(ch, fn);
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
      clearSession: () => Promise<{ ok: boolean; error?: string }>;
    };
    devices?: {
      getDevices: () => Promise<{ ok: boolean; devices: any[]; path: string }>;
      onUpdated: (handler: (list: any[]) => void) => () => void;
    };
  }
}
export {};
