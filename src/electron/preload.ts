import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  updateConfig: (partial: any) => ipcRenderer.invoke("config:update", partial),

  // ตัวอย่าง auth จากก่อนหน้า
  register: (username: string, password: string, role?: string) =>
    ipcRenderer.invoke("auth:register", { username, password, role }),
  login: (username: string, password: string) =>
    ipcRenderer.invoke("auth:login", { username, password }),
});

// Types (optional)
declare global {
  interface Window {
    api: {
      getConfig: () => Promise<{ ok: boolean; config: any; pathUsed: string }>;
      updateConfig: (p: any) => Promise<{ ok: boolean; config?: any; pathUsed?: string; error?: string }>;
      register: (u: string, p: string, r?: "admin"|"staff"|"maintenance") => Promise<{ ok: boolean; error?: string }>;
      login: (u: string, p: string) => Promise<{ ok: boolean; user?: { id:number; username:string; role:string }; error?: string }>;
    };
  }
}
export {};
