// src/electron/db.ts
import Database from "better-sqlite3";
import fs from "fs";
import { loadConfig } from "./config";
import path from "path";

export function openDB() {
  const { config, pathUsed } = loadConfig();

  // แปลง databasePath → absolute
  // baseDir: ถ้า path ถูกอ่านจากไฟล์ ให้ยึดโฟลเดอร์ไฟล์นั้น, ไม่งั้นใช้ process.cwd()
  const baseDir = pathUsed !== "(defaults)" ? path.dirname(pathUsed) : process.cwd();
  const dbFullPath = path.isAbsolute(config.databasePath)
    ? config.databasePath
    : path.join(baseDir, config.databasePath);

  console.log("[DB] Using:", dbFullPath);

  fs.mkdirSync(path.dirname(dbFullPath), { recursive: true });

  const db = new Database(dbFullPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin','staff','maintenance')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}
