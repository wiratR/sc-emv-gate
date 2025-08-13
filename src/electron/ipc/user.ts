// src/electron/ipc/user.ts

import type BetterSqlite3 from "better-sqlite3";
import bcrypt from "bcryptjs";
import { ipcMain } from "electron";

type LoggerLike = {
  debug: (...a:any[]) => void;
  info:  (...a:any[]) => void;
  warn:  (...a:any[]) => void;
  error: (...a:any[]) => void;
};

type DB = InstanceType<typeof BetterSqlite3>;

const ROLES = new Set(["admin", "staff", "maintenance"]);

export function setupUsersIPC(db: DB, logger: LoggerLike) {
  const listStmt = db.prepare(`SELECT id, username, role, created_at FROM users ORDER BY id ASC`);
  const insertStmt = db.prepare(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`);
  const delStmt = db.prepare(`DELETE FROM users WHERE username = ?`);

  ipcMain.handle("users:list", () => {
    try {
      const rows = listStmt.all();
      return { ok: true, users: rows };
    } catch (e:any) {
      logger.error("[users:list] failed", e);
      return { ok: false, error: e?.message || String(e) };
    }
  });

  ipcMain.handle("users:create", (_e, payload: { username: string; password: string; role: string }) => {
    try {
      const { username, password, role } = payload || {};
      if (!username || !password) return { ok: false, error: "username/password required" };
      if (!ROLES.has(role)) return { ok: false, error: "invalid role" };

      const hash = bcrypt.hashSync(password, 10);
      insertStmt.run(username, hash, role);
      return { ok: true };
    } catch (e:any) {
      logger.error("[users:create] failed", e);
      return { ok: false, error: e?.message || String(e) };
    }
  });

  ipcMain.handle("users:delete", (_e, username: string) => {
    try {
      if (!username) return { ok: false, error: "username required" };
      const info = delStmt.run(username);
      return { ok: true, deleted: info.changes };
    } catch (e:any) {
      logger.error("[users:delete] failed", e);
      return { ok: false, error: e?.message || String(e) };
    }
  });
}
