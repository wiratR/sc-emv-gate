// scripts/mock-hb.mjs
import http from "node:http";

const HB_HOST = process.env.MOCK_HB_HOST || "127.0.0.1";
const HB_PORT = Number(process.env.MOCK_HB_PORT || 3070);
const DEVICE_ID = process.env.MOCK_DEVICE_ID || "G1-01";
const DEVICE_IP = process.env.MOCK_DEVICE_IP || "127.0.0.1";
const DEVICE_STATUS = process.env.MOCK_DEVICE_STATUS || "online"; // 'online' | 'maintenance' | 'fault'
const INTERVAL_MS = Number(process.env.MOCK_HB_INTERVAL || 5000);

function sendOnce() {
  const payload = {
    id: DEVICE_ID,
    ip: DEVICE_IP,
    status: DEVICE_STATUS,
    ts: new Date().toISOString(),
  };
  const data = JSON.stringify(payload);

  const req = http.request(
    { hostname: HB_HOST, port: HB_PORT, path: "/hb", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } },
    (res) => {
      res.resume(); // ทิ้ง body
      console.log(`[mock-hb] sent: id=${payload.id} status=${payload.status} ts=${payload.ts}`);
    }
  );
  req.on("error", (e) => console.error("[mock-hb] error:", e.message));
  req.write(data);
  req.end();
}

sendOnce();
setInterval(sendOnce, INTERVAL_MS);
