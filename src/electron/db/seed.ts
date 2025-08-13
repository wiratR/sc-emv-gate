// src/electron/db/seed.ts

import type { AppConfig } from "../config";
import type BetterSqlite3 from "better-sqlite3";
import bcrypt from "bcryptjs";

type DB = InstanceType<typeof BetterSqlite3>;

type LoggerLike = {
  debug: (...a:any[]) => void;
  info:  (...a:any[]) => void;
  warn:  (...a:any[]) => void;
  error: (...a:any[]) => void;
};

export function seedUsersIfDev(db: DB, config: AppConfig, logger: LoggerLike) {
  const getCount = () =>
    (db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;

  const insert = db.prepare(`
    INSERT INTO users (username, password_hash, role)
    VALUES (@username, @password_hash, @role)
  `);

  // ────────── Development: ถ้ายังไม่มี user → สร้าง 3 บัญชี (admin/staff/maintenance)
  if (config.environment === "development") {
    const c = getCount();
    if (c > 0) {
      logger.info(`[seed] Found ${c} users → skip (dev)`);
      return;
    }

    logger.info("[seed] Seeding default users (development)");
    const users = [
      { username: "admin",        password: "1234", role: "admin" },
      { username: "staff",        password: "1234", role: "staff" },
      { username: "maintenance",  password: "1234", role: "maintenance" },
    ];

    const tx = db.transaction((items: Array<{ username:string; password:string; role:string }>) => {
      for (const u of items) {
        const password_hash = bcrypt.hashSync(u.password, 10);
        insert.run({ username: u.username, password_hash, role: u.role });
        logger.debug(`[seed] Inserted '${u.username}' (${u.role})`);
      }
    });

    try {
      tx(users);
      logger.info("[seed] Done (development)");
    } catch (err) {
      logger.error("[seed] Failed (development)", err);
    }
    return;
  }

  // ────────── Production: ถ้ายังไม่มี user → สร้าง admin คนเดียว
  if (config.environment === "production") {
    const c = getCount();
    if (c > 0) {
      logger.info(`[seed] Found ${c} users → skip (production)`);
      return;
    }

    const username = "admin";
    // แนะนำให้ตั้งผ่าน env ใน CI/เครื่องจริง
    const rawPass = process.env.ADMIN_PASSWORD || "1234";
    const password_hash = bcrypt.hashSync(rawPass, 10);

    try {
      insert.run({ username, password_hash, role: "admin" });
      logger.info("[seed] Created default admin user (production)");
      if (!process.env.ADMIN_PASSWORD) {
        logger.warn("[seed] ADMIN_PASSWORD is not set. Default admin password = '1234'. Please change it ASAP.");
      }
    } catch (err) {
      logger.error("[seed] Failed to create admin (production)", err);
    }
    return;
  }

  // ────────── อื่น ๆ (กันพลาด)
  logger.debug(`[seed] Environment '${config.environment}' → no seeding`);
}
