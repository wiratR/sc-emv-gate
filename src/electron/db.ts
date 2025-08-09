// src/electron/db.ts

import Database from "better-sqlite3";
import fs from "fs";
import { loadConfig } from "./config";
import path from "path";
import { seedUsersIfDev } from "./db/seed";

type LoggerLike = {
  debug: (...a:any[]) => void;
  info:  (...a:any[]) => void;
  warn:  (...a:any[]) => void;
  error: (...a:any[]) => void;
};

export function openDB(logger: LoggerLike) {
  const { config, pathUsed } = loadConfig();

  logger.info("[DB] Loading config from:", pathUsed);

  const baseDir = pathUsed !== "(defaults)" ? path.dirname(pathUsed) : process.cwd();
  const dbFullPath = path.isAbsolute(config.databasePath)
    ? config.databasePath
    : path.join(baseDir, config.databasePath);

  logger.info("[DB] Using:", dbFullPath);

  try {
    fs.mkdirSync(path.dirname(dbFullPath), { recursive: true });
    logger.debug("[DB] Ensured database directory exists");
  } catch (err) {
    logger.error("[DB] Failed to create database directory", err);
    throw err;
  }

  const db = new Database(dbFullPath);
  db.pragma("journal_mode = WAL");
  logger.debug("[DB] PRAGMA journal_mode = WAL");

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin','staff','maintenance')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    logger.debug("[DB] Ensured table 'users' exists");
  } catch (err) {
    logger.error("[DB] Failed creating 'users' table", err);
    throw err;
  }

  // ✅ seed เฉพาะ dev
  try {
    seedUsersIfDev(db, config, logger);
  } catch (err) {
    logger.error("[DB] Seeding default users failed", err);
  }

  return db;
}
