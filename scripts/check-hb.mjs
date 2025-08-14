// scripts/check-hb.mjs
import fs from "fs";

function summarizeHeartbeat(lastHeartbeat, { staleMs = 60000, offlineMs = 300000 } = {}) {
  const t = new Date(lastHeartbeat).getTime();
  const age = Date.now() - t;
  if (!isFinite(t)) return { status: "offline", ageMs: NaN, reason: "invalid timestamp" };
  const status = age <= staleMs ? "online" : age <= offlineMs ? "stale" : "offline";
  return { status, ageMs: age };
}

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.split("=");
    return [k.replace(/^--/, ""), v ?? true];
  })
);

// ใช้ไฟล์ดีฟอลต์ของโปรเจกต์
const file = args.file || "data/device-communication.json";
const staleMs = Number(args.stale || 60000);
const offlineMs = Number(args.offline || 300000);
const onlyId = args.id;

const raw = JSON.parse(fs.readFileSync(file, "utf8"));
// รองรับทั้งรูปแบบ [{...}] หรือ { devices: [...] }
const items = Array.isArray(raw) ? raw : (raw.devices || raw);

for (const d of items) {
  if (onlyId && d.id !== onlyId) continue;
  const hb = summarizeHeartbeat(d.lastHeartbeat, { staleMs, offlineMs });
  console.log(
    [d.id, d.name ?? "", hb.status, `${hb.ageMs|0}ms`, d.lastHeartbeat ?? "-"].join("\t")
  );
}
