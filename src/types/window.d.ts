// src/types/window.d.ts

type UserRole = "admin" | "staff" | "maintenance";

interface LoginResult {
  ok: boolean;
  user?: { id: number; username: string; role: UserRole };
  error?: string;
}

interface RegisterResult {
  ok: boolean;
  error?: string;
}

interface GetConfigResult {
  ok: boolean;
  config: any;
  pathUsed: string;
}

interface UpdateConfigResult {
  ok: boolean;
  config?: any;
  pathUsed?: string;
  error?: string;
}

declare global {
  interface Window {
    api?: {
      // auth
      login: (u: string, p: string) => Promise<{ ok: boolean; user?: { username: string; role: string } }>;
      logout?: () => Promise<void> | void;
      register: (u: string, p: string, r?: UserRole) => Promise<RegisterResult>;
      // config
      getConfig: () => Promise<GetConfigResult>;
      updateConfig: (partial: any) => Promise<UpdateConfigResult>;
      // log
      getLogInfo: () => Promise<{ ok:boolean; minLevel:string; logFile:string; logDir:string }>;
      openLogsFolder: () => Promise<{ ok:boolean; logDir:string }>;

      clearSession: () => Promise<{ ok: boolean; error?: string }>;
      // User
      listUsers: () => Promise<{ ok: boolean; users?: { username: string; role: "admin" | "staff" | "maintenance" }[]; error?: string }>;
      createUser: (payload: { username: string; password: string; role: "admin" | "staff" | "maintenance" }) => Promise<{ ok: true } | { ok: false; error: string }>;
      deleteUser: (username: string) => Promise<{ ok: true } | { ok: false; error: string }>;
    };
    devices?: {
      getDevices: () => Promise<{ ok: boolean; devices: any[]; path: string }>;
      onUpdated: (handler: (list: any[]) => void) => () => void; // returns unsubscribe
      reboot?: (deviceId: string) => Promise<{ ok: boolean; error?: string }>;
      openSSH?: (ip: string) => Promise<{ ok: boolean; error?: string }>;
      reboot?: (deviceId: string) => Promise<{ ok: boolean; error?: string }>;
      openSSH?: (ip: string) => Promise<{ ok: boolean; error?: string }>;
      getDeviceLog?: (args: {
        host: string;
        remotePath?: string;
      }) => Promise<{ ok: true; path: string } | { ok: false; error: string }>;
      // ipc/devices/probe.ts
      probe?: (
        host: string,
        port?: number,
        timeoutMs?: number
      ) => Promise<{ ok: true; reachable: boolean; rttMs: number } | { ok: false; error: string }>;

    };
    terminal?: {
      create: (opts?: {
        sshHost?: string;
        cols?: number;
        rows?: number;
        cwd?: string;
        shell?: string;
      }) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
      write: (id: string, data: string) => Promise<{ ok: boolean; error?: string }>;
      resize: (id: string, cols: number, rows: number) => Promise<{ ok: boolean; error?: string }>;
      kill: (id: string) => Promise<{ ok: boolean; error?: string }>;
      // ✅ รูปแบบใหม่: รับ callback “ตัวเดียว”
      onData: (cb: (_e: any, p: { id: string; data: string }) => void) => void;
      offData: (cb: (_e: any, p: { id: string; data: string }) => void) => void;
      onExit: (cb: (_e: any, p: { id: string; exitCode?: number; signal?: number }) => void) => void;
      offExit: (cb: (_e: any, p: { id: string; exitCode?: number; signal?: number }) => void) => void;
    };
  }
}

type LogLevel = "debug" | "info" | "warn" | "error";
declare global {
  interface Window {
    logger?: {
      debug: (...args: any[]) => void;
      info:  (...args: any[]) => void;
      warn:  (...args: any[]) => void;
      error: (...args: any[]) => void;
    };
  }
}

export {};
