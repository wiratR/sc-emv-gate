// scripts/mock-hb.mjs
import http from "node:http";

const HB_HOST = process.env.MOCK_HB_HOST || "127.0.0.1";
const HB_PORT = Number(process.env.MOCK_HB_PORT || 3070);

const DEVICE_ID   = process.env.MOCK_DEVICE_ID   || "G1-01";
const DEVICE_IP   = process.env.MOCK_DEVICE_IP   || "127.0.0.1";
const INTERVAL_MS = Number(process.env.MOCK_HB_INTERVAL || 5000);

// เดิม: ใช้สถานะเดียวผ่าน ENV นี้ (ยังใช้ได้)
const DEFAULT_STATUS = (process.env.MOCK_DEVICE_STATUS || "online").toLowerCase();

// ใหม่: รองรับลิสต์สถานะวน (เช่น "online,maintenance,fault")
// ถ้าไม่กำหนด จะ fallback ไปใช้ DEFAULT_STATUS
const RAW_SEQ = (process.env.MOCK_HB_STATUS_SEQ || "").trim();
const ALLOWED = new Set(["online", "maintenance", "fault", "offline", "stale"]);

const STATUS_SEQ = (RAW_SEQ
  ? RAW_SEQ.split(",").map(s => s.trim().toLowerCase()).filter(s => ALLOWED.has(s))
  : [DEFAULT_STATUS]
);

// ถ้าในลิสต์ไม่มีตัวถูกต้องเลย → ใช้ online กันพัง
if (STATUS_SEQ.length === 0) STATUS_SEQ.push("online");

// โหมดสุ่ม (เลือกจาก STATUS_SEQ) — ตั้ง MOCK_HB_RANDOM=1
const RANDOM = process.env.MOCK_HB_RANDOM === "1";

let seqIndex = 0;
function pickStatus() {
  if (RANDOM) {
    const i = Math.floor(Math.random() * STATUS_SEQ.length);
    return STATUS_SEQ[i];
  }
  const s = STATUS_SEQ[seqIndex % STATUS_SEQ.length];
  seqIndex += 1;
  return s;
}

function sendOnce() {
  const status = pickStatus();
  const payload = {
    id: DEVICE_ID,
    ip: DEVICE_IP,
    status,                    // ← ส่ง maintenance/online/fault/offline/stale ได้
    ts: new Date().toISOString(),
  };

  const data = JSON.stringify(payload);
  const req = http.request(
    {
      hostname: HB_HOST,
      port: HB_PORT,
      path: "/hb",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    },
    (res) => {
      res.resume(); // ทิ้ง body
      console.log(
        `[mock-hb] sent: id=${payload.id} status=${payload.status} ts=${payload.ts}`
      );
    }
  );
  req.on("error", (e) => console.error("[mock-hb] error:", e.message));
  req.write(data);
  req.end();
}

sendOnce();
setInterval(sendOnce, INTERVAL_MS);
