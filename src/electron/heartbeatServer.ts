import fs from "fs";
// src/electron/heartbeatServer.ts
import http from "http";
import { loadConfig } from "./config";
import path from "path";

type HB = {
  id: string;
  ip?: string;
  gateId?: string;
  side?: "north" | "south";
  type?: string;
  status?: "online" | "maintenance" | "fault";
  ts?: string;        // ISO8601 (UTC). ถ้าไม่ส่งมา จะเติมให้เป็นเวลาปัจจุบัน
  message?: string;
};

type StoreItem = HB & { lastHeartbeat: string };

function getStorePath() {
  const { config, pathUsed } = loadConfig();
  const baseDir = pathUsed !== "(defaults)" ? path.dirname(pathUsed) : process.cwd();
  const dir = path.isAbsolute(config.deviceCommunicationPath || "./data")
    ? (config.deviceCommunicationPath as string)
    : path.join(baseDir, config.deviceCommunicationPath || "./data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "device-communication.json");
}

function readStore(): StoreItem[] {
  const p = getStorePath();
  if (!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    const list = Array.isArray(raw) ? raw : (raw.devices || []);
    return list as StoreItem[];
  } catch { return []; }
}

function writeStore(items: StoreItem[]) {
  const p = getStorePath();
  const body = JSON.stringify({ devices: items }, null, 2);
  fs.writeFileSync(p, body);
}

function upsert(items: StoreItem[], hb: HB): StoreItem[] {
  const nowIso = new Date().toISOString();
  const ts = hb.ts || nowIso;
  const i = items.findIndex(x => x.id === hb.id);
  const merged: StoreItem = {
    ...(i >= 0 ? items[i] : { id: hb.id }),
    ...hb,
    lastHeartbeat: ts,
  };
  if (i >= 0) items[i] = merged; else items.push(merged);
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

export type HeartbeatServer = {
  port: number;
  close: () => void;
};

export function startHeartbeatServerFromConfig(): HeartbeatServer {
  const { config } = loadConfig();
  const port = Number(config.heartbeatPort || 3070);

  const server = http.createServer((req, res) => {
    // CORS เบื้องต้น
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

    if (req.method === "GET" && req.url === "/hb") {
      return okJson(res, { ok: true, devices: readStore() });
    }

    const collectBody = (cb: (body: any) => void) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        try { cb(JSON.parse(data || "{}")); }
        catch { bad(res, 400, "invalid json"); }
      });
    };

    if (req.method === "POST" && req.url === "/hb") {
      collectBody((body) => {
        if (!body?.id) return bad(res, 400, "id required");
        let items = readStore();
        items = upsert(items, body as HB);
        writeStore(items);
        return okJson(res, { ok: true });
      });
      return;
    }

    if (req.method === "POST" && req.url === "/hb/bulk") {
      collectBody((body) => {
        if (!Array.isArray(body)) return bad(res, 400, "array required");
        let items = readStore();
        for (const b of body) if (b && b.id) items = upsert(items, b as HB);
        writeStore(items);
        return okJson(res, { ok: true, count: body.length });
      });
      return;
    }

    bad(res, 404, "not found");
  });

  server.listen(port, () => {
    console.log(`[HB] listening on :${port}`);
  });

  return {
    port,
    close: () => server.close(),
  };
}
