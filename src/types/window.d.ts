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
      login: (u: string, p: string) => Promise<LoginResult>;
      register: (u: string, p: string, r?: UserRole) => Promise<RegisterResult>;
      // config
      getConfig: () => Promise<GetConfigResult>;
      updateConfig: (partial: any) => Promise<UpdateConfigResult>;
      // log
      getLogInfo: () => Promise<{ ok:boolean; minLevel:string; logFile:string; logDir:string }>;
      openLogsFolder: () => Promise<{ ok:boolean; logDir:string }>;
    };
    devices?: {
      getDevices: () => Promise<{ ok: boolean; devices: any[]; path: string }>;
      onUpdated: (handler: (list: any[]) => void) => () => void; // returns unsubscribe
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
