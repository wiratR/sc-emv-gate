// node >= 18 (ESM)
const rawHost = process.env.HB_HOST || "http://127.0.0.1:3070";
const HOST = rawHost.replace(/\/+$/, ""); // ตัด trailing slash

// canonical operations
const OPS = new Set([
  "inservice_entry",
  "inservice_exit",
  "inservice_bidirect",
  "out_of_service",
  "station_close",
  "emergency",
]);

// alias / ตัวช่วย normalize คำสั่งให้กลายเป็น canonical
function normalizeOp(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();

  // รับรูปแบบ inservice:xxx
  const m = s.match(/^in(service)?[:\s_-]?(entry|exit|bi|bidirect|bi[-\s]?direction|bi-direction)$/i);
  if (m) {
    const mode = m[2];
    if (/^entry$/.test(mode)) return "inservice_entry";
    if (/^exit$/.test(mode)) return "inservice_exit";
    return "inservice_bidirect";
  }

  // ชุด alias ยอดฮิต
  const map = {
    entry: "inservice_entry",
    "in-entry": "inservice_entry",
    "in:entry": "inservice_entry",

    exit: "inservice_exit",
    "in-exit": "inservice_exit",
    "in:exit": "inservice_exit",

    bi: "inservice_bidirect",
    bidirect: "inservice_bidirect",
    "bi-direction": "inservice_bidirect",
    "bi direction": "inservice_bidirect",
    "in-bi": "inservice_bidirect",
    "in:bi": "inservice_bidirect",

    oos: "out_of_service",
    out: "out_of_service",
    "out-of-service": "out_of_service",
    "out of service": "out_of_service",

    close: "station_close",
    "station-close": "station_close",
    "station close": "station_close",

    emer: "emergency",
    emergency: "emergency",
  };

  if (OPS.has(s)) return s;                 // ใส่ค่าถูกต้องมาอยู่แล้ว
  if (map[s]) return map[s];                // ตรงกับ alias
  return null;
}

async function setOp(deviceId, opRaw) {
  const op = normalizeOp(opRaw);
  if (!op || !OPS.has(op)) {
    console.error(`[mock-op] invalid operation: "${opRaw}"\n`);
    printUsage();
    process.exit(2);
  }

  const res = await fetch(`${HOST}/operation/${encodeURIComponent(deviceId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation: op }),
  });

  let body = {};
  try { body = await res.json(); } catch {}

  if (!res.ok || !body.ok) {
    console.error("[mock-op] failed to set operation:", { status: res.status, body });
    process.exit(1);
  }
  console.log(`[mock-op] set ${deviceId} -> ${op} : OK`);
}

async function getOp(deviceId) {
  const res = await fetch(`${HOST}/operation/${encodeURIComponent(deviceId)}`);
  let body = {};
  try { body = await res.json(); } catch {}

  if (!res.ok || !body.ok) {
    console.error("[mock-op] failed to get operation:", { status: res.status, body });
    process.exit(1);
  }
  console.log(`[mock-op] ${deviceId} = ${body.operation ?? "null"}`);
}

function listOps() {
  console.log("Allowed operations (canonical):");
  for (const op of OPS) console.log(" -", op);
  console.log("\nAliases:");
  console.log('  entry | in:entry | in-entry');
  console.log('  exit  | in:exit  | in-exit');
  console.log('  bi | bidirect | bi-direction | in:bi | in-bi');
  console.log('  oos | out | out-of-service');
  console.log('  close | station-close');
  console.log('  emer | emergency');
}

function printUsage() {
  console.log(`
Usage:
  node scripts/mock-op.mjs list
  node scripts/mock-op.mjs get <deviceId>
  node scripts/mock-op.mjs set <deviceId> <operation>

Examples:
  node scripts/mock-op.mjs list
  node scripts/mock-op.mjs get G1-01
  node scripts/mock-op.mjs set G1-01 in:entry
  node scripts/mock-op.mjs set G1-01 inservice_exit
  node scripts/mock-op.mjs set G1-01 bi
  node scripts/mock-op.mjs set G1-01 oos
  node scripts/mock-op.mjs set G1-01 close
  node scripts/mock-op.mjs set G1-01 emergency

Env:
  HB_HOST   default = http://127.0.0.1:3070
`.trim());
}

async function main() {
  const [cmd, deviceId, op] = process.argv.slice(2);

  if (!cmd) {
    printUsage();
    process.exit(0);
  }

  if (cmd === "list") {
    listOps();
    return;
  }

  if (cmd === "get") {
    if (!deviceId) return printUsage();
    await getOp(deviceId);
    return;
  }

  if (cmd === "set") {
    if (!deviceId || !op) return printUsage();
    await setOp(deviceId, op);
    return;
  }

  console.error("Unknown command:", cmd);
  printUsage();
  process.exit(2);
}

main().catch((e) => {
  console.error("[mock-op] error:", e);
  process.exit(1);
});
