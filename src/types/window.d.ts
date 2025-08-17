// src/types/window.d.ts

type UserRole = "admin" | "staff" | "maintenance";

/** Current gate operation modes */
type Operation =
  | "inservice_entry"
  | "inservice_exit"
  | "inservice_bidirect"
  | "out_of_service"
  | "station_close"
  | "emergency";

/** App configuration shape (loaded from config.json) */
interface AppConfig {
  environment?: "development" | "production";
  logLevel?: string;
  heartbeatPort?: number;
  deviceCommunicationPath?: string;
  stationName?: string;
  stationId?: string;
  stationIp?: string;
  fullScreen?: boolean;
  databasePath?: string;
  logsPath?: string;

  /** Port used to probe device reachability (SSH/custom). Default: 22 */
  deviceProbePort?: number;
}

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
  config: AppConfig;
  pathUsed: string;
}

interface UpdateConfigResult {
  ok: boolean;
  config?: AppConfig;
  pathUsed?: string;
  error?: string;
}

declare global {
  interface Window {
    api?: {
      // ── Auth
      login: (u: string, p: string) => Promise<{ ok: boolean; user?: { username: string; role: UserRole } }>;
      logout?: () => Promise<void> | void;
      register: (u: string, p: string, r?: UserRole) => Promise<RegisterResult>;

      // ── Config
      getConfig: () => Promise<GetConfigResult>;
      //updateConfig: (partial: Partial<AppConfig>) => Promise<UpdateConfigResult>;
      updateConfig: (p: any) => Promise<UpdateConfigResult>;

      // ── Logs
      getLogInfo: () => Promise<{ ok: boolean; minLevel: string; logFile: string; logDir: string }>;
      openLogsFolder: () => Promise<{ ok: boolean; logDir: string }>;

      // ── Misc
      clearSession: () => Promise<{ ok: boolean; error?: string }>;

      // ── Users
      listUsers: () => Promise<{
        ok: boolean;
        users?: { username: string; role: UserRole }[];
        error?: string;
      }>;
      createUser: (payload: { username: string; password: string; role: UserRole }) =>
        Promise<{ ok: true } | { ok: false; error: string }>;
      deleteUser: (username: string) =>
        Promise<{ ok: true } | { ok: false; error: string }>;
    };

    /** Device IPC bridge */
    devices?: {
      getDevices: () => Promise<{ ok: boolean; devices: any[]; path: string }>;
      /** subscribe → returns unsubscribe */
      onUpdated: (handler: (list: any[]) => void) => () => void;

      reboot?: (deviceId: string) => Promise<{ ok: boolean; error?: string }>;
      openSSH?: (ip: string) => Promise<{ ok: boolean; error?: string }>;

      getDeviceLog?: (args: {
        host: string;
        remotePath?: string;
      }) => Promise<{ ok: true; path: string } | { ok: false; error: string }>;

      /** TCP reachability probe (e.g., SSH) */
      probe?: (
        host: string,
        port?: number,
        timeoutMs?: number
      ) => Promise<
        | { ok: true; reachable: boolean; rttMs: number }
        | { ok: false; error: string }
      >;

      /** Query current gate operation from heartbeat server memory */
      getCurrentOperation?: (
        deviceId: string
      ) => Promise<{ ok: true; operation: Operation | null } | { ok: false; error: string }>;
      setCurrentOperation?: (p: { deviceId: string; operation: Operation }) => Promise<
        { ok: true } | { ok: false; error: string }
      >;
    };

    /** Terminal/xterm bridge – global callback style */
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

      /** Subscribe to all terminal data events; filter by payload.id in the handler */
      onData: (cb: (_e: any, p: { id: string; data: string }) => void) => void;
      offData: (cb: (_e: any, p: { id: string; data: string }) => void) => void;

      /** Subscribe to all terminal exit events; filter by payload.id in the handler */
      onExit: (cb: (_e: any, p: { id: string; exitCode?: number; signal?: number }) => void) => void;
      offExit: (cb: (_e: any, p: { id: string; exitCode?: number; signal?: number }) => void) => void;
    };

    /** Optional console logger injected by preload */
    logger?: {
      debug: (...args: any[]) => void;
      info: (...args: any[]) => void;
      warn: (...args: any[]) => void;
      error: (...args: any[]) => void;
    };

    /**
     * (Optional) Convenience alias – if you expose it in preload.
     * Not strictly required; your code can use window.api.getConfig/updateConfig directly.
     */
    config?: {
      get: () => Promise<GetConfigResult>;
      set?: (partial: Partial<AppConfig>) => Promise<UpdateConfigResult>;
      onChanged?: (cb: (cfg: AppConfig) => void) => () => void;
    };
  }
}

export {};
