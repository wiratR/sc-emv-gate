/* scripts/normalize-devices.js
 * แปลง data/device-communication.json ให้เป็น "อาเรย์ของอุปกรณ์" ตรง ๆ
 * - ถ้าไฟล์เป็น { "devices": [...] } จะดึงออกมาเป็น [...]
 * - ถ้าเป็น object map จะดึงค่าเป็นอาเรย์
 * - map ฟิลด์ ip -> deviceIp และ ts -> lastHeartbeat (ถ้าไม่มี)
 */

const fs = require("fs");
const path = require("path");

const INPUT = path.resolve(process.cwd(), "data/device-communication.json");

function coerceArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.devices)) return data.devices;
  if (data && typeof data === "object") return Object.values(data);
  return [];
}

function normalizeItem(d) {
  const out = { ...d };
  if (!out.deviceIp && out.ip) out.deviceIp = out.ip;
  if (!out.lastHeartbeat && out.ts) out.lastHeartbeat = out.ts;
  // default
  if (!out.status) out.status = "offline";
  return out;
}

function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`[normalize-devices] not found: ${INPUT}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  const arr = coerceArray(raw).map(normalizeItem);

  // สำรองไฟล์เดิม
  const backup = INPUT.replace(/\.json$/i, `.${Date.now()}.bak.json`);
  fs.copyFileSync(INPUT, backup);

  // เขียนใหม่เป็นอาเรย์สวย ๆ
  fs.writeFileSync(INPUT, JSON.stringify(arr, null, 2));
  console.log(`[normalize-devices] wrote array to ${INPUT}`);
  console.log(`[normalize-devices] backup saved at ${backup}`);
  console.log(`[normalize-devices] count = ${arr.length}`);
}

main();
