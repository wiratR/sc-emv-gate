// src/electron/db/seed.ts

import type { AppConfig } from "../config";
import type Database from "better-sqlite3";
import bcrypt from "bcryptjs";

type LoggerLike = {
  debug: (...a:any[]) => void;
  info:  (...a:any[]) => void;
  warn:  (...a:any[]) => void;
  error: (...a:any[]) => void;
};

export function seedUsersIfDev(db: Database, config: AppConfig, logger: LoggerLike) {
  if (config.environment !== "development") {
    logger.debug("[seed] Environment is not 'development' → skip");
    return;
  }

  const row = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (row.c > 0) {
    logger.info(`[seed] Found ${row.c} existing users → skip seeding`);
    return;
  }

  logger.info("[seed] No users found → seeding default users (dev)");

  const users = [
    { username: "admin",        password: "1234", role: "admin" },
    { username: "staff",        password: "1234", role: "staff" },
    { username: "maintenance",  password: "1234", role: "maintenance" },
  ];

  const insert = db.prepare(`
    INSERT INTO users (username, password_hash, role)
    VALUES (@username, @password_hash, @role)
  `);

  const tx = db.transaction((items: Array<{ username:string; password:string; role:string }>) => {
    for (const u of items) {
      const password_hash = bcrypt.hashSync(u.password, 10);
      insert.run({ username: u.username, password_hash, role: u.role });
      logger.debug(`[seed] Inserted '${u.username}' as '${u.role}'`);
    }
  });

  try {
    tx(users);
    logger.info("[seed] Default users seeded successfully");
  } catch (err) {
    logger.error("[seed] Failed to seed users", err);
  }
}
