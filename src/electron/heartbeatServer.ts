// src/electron/heartbeatServer.ts

import http from "http";
import fs from "fs";
import path from "path";

import { loadConfig } from "./config";
import { isOperation, type Operation } from "./models/operations";

/** โครง HB ที่อุปกรณ์ส่งมา */
type HB = {
  id: string;
  ip?: string;
  gateId?: string;
  side?: "north" | "south";
  type?: string;
  status?: "online" | "maintenance" | "fault";
  ts?: string;            // ISO8601 (UTC) ถ้าไม่ส่ง จะเติมให้เป็นเวลาปัจจุบัน
  message?: string;
};

/** โครงจัดเก็บ (เพิ่ม lastHeartbeat) */
type StoreItem = HB & { lastHeartbeat: string };

export type HeartbeatServer = {
  port: number;
  close: () => void;
  getCurrentOperation: (deviceId: string) => Operation | undefined;
  setCurrentOperation: (deviceId: string, op: Operation) => void;
};

// เก็บ operation ปัจจุบันของแต่ละ deviceId
const currentOp = new Map<string, Operation>();

// ──────────────────────────── Utilities ────────────────────────────

function getStorePath(): string {
  const { config, pathUsed } = loadConfig();
  const baseDir = pathUsed !== "(defaults)" ? path.dirname(pathUsed) : process.cwd();

  // อนุญาตให้เป็น path โฟลเดอร์ (ปกติ) หรือ relative จากไฟล์ config
  const targetDir = path.isAbsolute(config.deviceCommunicationPath || "./data")
    ? (config.deviceCommunicationPath as string)
    : path.join(baseDir, config.deviceCommunicationPath || "./data");

  fs.mkdirSync(targetDir, { recursive: true });
  return path.join(targetDir, "device-communication.json");
}

function readStore(): StoreItem[] {
  const p = getStorePath();
  if (!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    // รองรับทั้งรูปแบบ array (เก่า) และ { devices: [...] } (ใหม่)
    const list = Array.isArray(raw) ? raw : raw.devices || [];
    return Array.isArray(list) ? (list as StoreItem[]) : [];
  } catch {
    return [];
  }
}

function writeStore(items: StoreItem[]) {
  const p = getStorePath();
  const body = JSON.stringify({ devices: items }, null, 2);
  fs.writeFileSync(p, body);
}

function upsert(items: StoreItem[], hb: HB): StoreItem[] {
  const nowIso = new Date().toISOString();
  const ts = hb.ts || nowIso;
  const i = items.findIndex((x) => x.id === hb.id);
  const merged: StoreItem = {
    ...(i >= 0 ? items[i] : { id: hb.id }),
    ...hb,
    lastHeartbeat: ts,
  };
  if (i >= 0) items[i] = merged;
  else items.push(merged);
  return items;
}

function okJson(res: http.ServerResponse, obj: any) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}

function bad(res: http.ServerResponse, code = 400, error = "bad request") {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: false, error }));
}

function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function setCors(res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
}

// ดึงพาธและพารามิเตอร์จาก URL
function parseUrl(req: http.IncomingMessage, port: number) {
  const u = new URL(req.url || "/", `http://localhost:${port}`);
  return { pathname: u.pathname, searchParams: u.searchParams };
}

// ──────────────────────── HTTP Server (no Express) ────────────────────────

export function startHeartbeatServerFromConfig(): HeartbeatServer {
  const { config } = loadConfig();
  const port = Number(config.heartbeatPort || 3070);

  const server = http.createServer(async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    const { pathname } = parseUrl(req, port);

    try {
      // GET /hb → คืนทั้งหมด
      if (req.method === "GET" && pathname === "/hb") {
        return okJson(res, { ok: true, devices: readStore() });
      }

      // POST /hb → upsert รายการเดียว
      if (req.method === "POST" && pathname === "/hb") {
        const body = await readJsonBody(req).catch(() => null);
        if (!body || !body.id) return bad(res, 400, "id required");
        let items = readStore();
        items = upsert(items, body as HB);
        writeStore(items);
        return okJson(res, { ok: true });
      }

      // POST /hb/bulk → upsert หลายรายการ
      if (req.method === "POST" && pathname === "/hb/bulk") {
        const body = await readJsonBody(req).catch(() => null);
        if (!Array.isArray(body)) return bad(res, 400, "array required");
        let items = readStore();
        for (const b of body) if (b && b.id) items = upsert(items, b as HB);
        writeStore(items);
        return okJson(res, { ok: true, count: body.length });
      }

      // POST /operation/:deviceId
      // รูปแบบพาธ: /operation/DEVICE_ID
      if (req.method === "POST" && pathname.startsWith("/operation/")) {
        const deviceId = decodeURIComponent(pathname.split("/")[2] || "");
        if (!deviceId) return bad(res, 400, "missing deviceId");

        const body = await readJsonBody(req).catch(() => null);
        const op = String(body?.operation || "");
        if (!isOperation(op)) return bad(res, 400, "invalid operation");

        currentOp.set(deviceId, op as Operation);
        return okJson(res, { ok: true });
      }

      // GET /operation/:deviceId
      if (req.method === "GET" && pathname.startsWith("/operation/")) {
        const deviceId = decodeURIComponent(pathname.split("/")[2] || "");
        if (!deviceId) return bad(res, 400, "missing deviceId");
        const op = currentOp.get(deviceId) ?? null;
        return okJson(res, { ok: true, operation: op });
      }

      // not found
      return bad(res, 404, "not found");
    } catch (err: any) {
      return bad(res, 500, String(err?.message || err));
    }
  });

  server.listen(port, () => {
    console.log(`[HB] listening on :${port}`);
  });

  return {
    port,
    close: () => server.close(),
    getCurrentOperation: (deviceId: string) => currentOp.get(deviceId),
    setCurrentOperation: (deviceId: string, op: Operation) => currentOp.set(deviceId, op),
  };
}
