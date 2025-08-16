// scripts/mock-probe.mjs

import net from "node:net";

const port = Number(process.env.MOCK_PROBE_PORT || 2222);
const host = process.env.MOCK_PROBE_HOST || "0.0.0.0";

const server = net.createServer((socket) => {
  // ไม่ต้องเขียนอะไรใส่ client เพราะ nc -vz จะปิดทันที → เขียนอาจเจอ EPIPE/ECONNRESET
  socket.setNoDelay(true);

  socket.on("error", (err) => {
    if (err && (err.code === "ECONNRESET" || err.code === "EPIPE")) {
      // เงียบไว้ เคสปกติเวลาคลายการเชื่อมต่ออย่างรวดเร็ว
      return;
    }
    console.error("[mock-probe] socket error:", err.message);
  });

  // ปิดทันที (หรือจะใช้ socket.end() ก็ได้ แต่ destroy() ปลอดภัยกว่าเพราะไม่พยายามส่ง FIN ชัดเจน)
  socket.destroy();
});

server.on("listening", () => {
  const addr = server.address();
  const shown =
    typeof addr === "object" && addr ? `${addr.address}:${addr.port}` : String(addr);
  console.log(`[mock-probe] listening on ${shown}`);
});

server.on("error", (err) => {
  console.error("[mock-probe] server error:", err.message);
  process.exitCode = 1;
});

server.listen(port, host);
