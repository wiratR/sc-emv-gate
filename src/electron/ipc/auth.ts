import type Database from "better-sqlite3";
import bcrypt from "bcryptjs";
// src/electron/ipc/auth.ts
import { ipcMain } from "electron";

export function setupAuthIPC(db: Database.Database) {
  const insertUser = db.prepare(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)"
  );
  const getUser = db.prepare(
    "SELECT id, username, password_hash, role FROM users WHERE username = ?"
  );

  ipcMain.handle("auth:register", async (_e, { username, password, role }) => {
    if (!username || !password) return { ok: false, error: "Missing fields" };
    const normalized = String(username).trim().toLowerCase();
    const allowed = ["admin", "staff", "maintenance"];
    const safeRole = allowed.includes(role) ? role : "staff";
    const hash = await bcrypt.hash(password, 10);
    try {
      insertUser.run(normalized, hash, safeRole);
      return { ok: true };
    } catch (e: any) {
      if (String(e?.message || "").includes("UNIQUE")) {
        return { ok: false, error: "Username already exists" };
      }
      return { ok: false, error: "Register failed" };
    }
  });

  ipcMain.handle("auth:login", async (_e, { username, password }) => {
    const normalized = String(username).trim().toLowerCase();
    const row = getUser.get(normalized);
    if (!row) return { ok: false, error: "Invalid credentials" };
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) return { ok: false, error: "Invalid credentials" };
    return { ok: true, user: { id: row.id, username: row.username, role: row.role } };
  });
}
