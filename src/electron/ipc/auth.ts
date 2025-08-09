// src/electron/ipc/auth.ts

import type BetterSqlite3 from "better-sqlite3";
import bcrypt from "bcryptjs";
import { ipcMain } from "electron";

type DB = InstanceType<typeof BetterSqlite3>;
type Role = "admin" | "staff" | "maintenance";
type UserRow = { id: number; username: string; password_hash: string; role: Role };

export function setupAuthIPC(db: DB) {
  ipcMain.handle("auth:login", (_e, payload: { username: string; password: string }) => {
    const { username, password } = payload || { username: "", password: "" };

    const stmt = db.prepare(
      "SELECT id, username, password_hash, role FROM users WHERE username = @username"
    );
    const row = stmt.get({ username }) as UserRow | undefined;

    if (!row) return { ok: false, error: "User not found" };
    if (!bcrypt.compareSync(password, row.password_hash)) {
      return { ok: false, error: "Invalid password" };
    }

    return { ok: true, user: { id: row.id, username: row.username, role: row.role } };
  });

  ipcMain.handle("auth:register", (_e, payload: { username: string; password: string; role?: Role }) => {
    const { username, password, role = "staff" } = payload || ({} as any);

    const exists = db.prepare("SELECT 1 FROM users WHERE username = @username").get({ username }) as
      | { 1: 1 }
      | undefined;
    if (exists) return { ok: false, error: "Username already exists" };

    const hash = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES (@username, @hash, @role)")
      .run({ username, hash, role });

    return { ok: true };
  });
}
