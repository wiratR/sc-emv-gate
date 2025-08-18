// scripts/device-sim.mjs
// Node >= 18 (ESM)
import net from "node:net";
import readline from "node:readline";

const HOST = (process.env.HB_HOST || "http://127.0.0.1:3070").replace(/\/+$/, "");

/** ----- Operations (canonical + alias) ----- */
const OPS = new Set([
  "inservice_entry",
  "inservice_exit",
  "inservice_bidirect",
  "out_of_service",
  "station_close",
  "emergency",
]);

function normalizeOp(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();

  const m = s.match(/^in(service)?[:\s_-]?(entry|exit|bi|bidirect|bi[-\s]?direction)$/i);
  if (m) {
    const mode = m[2].toLowerCase();
    if (mode === "entry") return "inservice_entry";
    if (mode === "exit") return "inservice_exit";
    return "inservice_bidirect";
  }

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

  if (OPS.has(s)) return s;
  if (map[s]) return map[s];
  return null;
}

/** ----- Args/Flags parsing ----- */
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (typeof v === "undefined") {
        const next = argv[i + 1];
        if (next && !next.startsWith("-")) {
          out[k] = next; i++;
        } else {
          out[k] = true;
        }
      } else {
        out[k] = v;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function clampPort(n) {
  const x = Number(n);
  return Number.isFinite(x) && x >= 1 && x <= 65535 ? x : NaN;
}

/** ----- Heartbeat (use fetch) ----- */
async function sendHeartbeat({ deviceId, deviceIp, status }) {
  const payload = { id: deviceId, ip: deviceIp, status, ts: new Date().toISOString() };
  try {
    const res = await fetch(`${HOST}/hb`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(`[device-sim] HB sent: id=${payload.id} status=${payload.status} ts=${payload.ts}`);
    return true;
  } catch (e) {
    console.error("[device-sim] HB error:", e.message);
    return false;
  }
}

/** ----- GET/POST Operation ----- */
async function getOp(deviceId) {
  const res = await fetch(`${HOST}/operation/${encodeURIComponent(deviceId)}`);
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(`GET op failed: ${res.status} ${JSON.stringify(j)}`);
  return j.operation ?? null;
}

async function setOp(deviceId, opRaw) {
  const op = normalizeOp(opRaw);
  if (!op || !OPS.has(op)) throw new Error(`invalid operation: "${opRaw}"`);
  const res = await fetch(`${HOST}/operation/${encodeURIComponent(deviceId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation: op }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(`SET op failed: ${res.status} ${JSON.stringify(j)}`);
  return op;
}

/** ----- Optional TCP probe server ----- */
function makeProbeServer(port) {
  let server = null;
  let listening = false;

  async function on() {
    if (listening) return true;
    await new Promise((resolve, reject) => {
      server = net.createServer((socket) => {
        socket.setNoDelay(true);
        socket.on("error", () => {});       // ← กลืน error จาก client ที่รีเซ็ตเร็ว
        socket.on("data", () => {});        // ← อ่านทิ้ง
        try { socket.write("OK\r\n"); } catch {}
        socket.end();
      });
      server.on("error", (e) => {
        console.error(`[device-sim] probe server error: ${e.message}`);
        reject(e);
      });
      server.listen(port, () => resolve());
    }).catch(() => {});
    listening = !!server?.listening;
    if (listening) console.log(`[device-sim] probe server ON :${port}`);
    return listening;
  }

  async function off() {
    if (!server) return true;
    await new Promise((resolve) => server.close(() => resolve()));
    server = null;
    listening = false;
    console.log("[device-sim] probe server OFF");
    return true;
  }

  async function toggle() {
    if (listening) return off();
    return on();
  }

  return { on, off, toggle, isOn: () => listening };
}

/** ----- CLI help ----- */
function printUsage() {
  console.log(`
Device Simulator (HB + Operation poll + optional probe port)

Usage:
  node scripts/device-sim.mjs run --id G1-01 --ip 127.0.0.1 [--status online|maintenance|fault] [--hb-interval 5000] [--op-poll 2000] [--probe-port 2222] [--probe on|off]
  node scripts/device-sim.mjs get <deviceId>
  node scripts/device-sim.mjs set <deviceId> <operation>

While running "run" mode, you can type commands:
  set <op>           set operation (aliases ok: in:entry, in:exit, bi, oos, close, emer)
  get                get current operation
  status <s>         change device status (online|maintenance|fault)
  probe on|off|toggle
  help               show this help
  quit/exit          stop simulator

Env:
  HB_HOST   default = ${HOST}
`.trim());
}

/** ----- Main ----- */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, a1, a2] = args._;

  if (!cmd) {
    printUsage();
    return;
  }

  if (cmd === "get") {
    if (!a1) return printUsage();
    const op = await getOp(a1);
    console.log(`[device-sim] ${a1} = ${op ?? "null"}`);
    return;
  }

  if (cmd === "set") {
    if (!a1 || !a2) return printUsage();
    const op = await setOp(a1, a2);
    console.log(`[device-sim] set ${a1} -> ${op} : OK`);
    return;
  }

  if (cmd === "run") {
    const deviceId = args.id || a1 || "G1-01";
    const deviceIp = args.ip || "127.0.0.1";
    let devStatus = (args.status || "online").toLowerCase(); // online|maintenance|fault
    const hbInterval = Number(args["hb-interval"] || 5000);
    const opPoll = Number(args["op-poll"] || 2000);

    let probePort = args["probe-port"] ? clampPort(args["probe-port"]) : NaN;
    const wantProbe = String(args.probe || "").toLowerCase();
    const probe = Number.isFinite(probePort) ? makeProbeServer(probePort) : null;

    if (probe) {
      if (wantProbe === "on") await probe.on();
      else if (wantProbe === "off") await probe.off();
      else console.log(`[device-sim] probe ready on :${probePort} (initial=${probe.isOn() ? "ON" : "OFF"})`);
    }

    console.log(`[device-sim] RUN as device "${deviceId}" (${deviceIp})`);
    console.log(`[device-sim] HB every ${hbInterval}ms; op-poll ${opPoll}ms; status=${devStatus}`);

    // HB loop
    const hbTimer = setInterval(() => {
      void sendHeartbeat({ deviceId, deviceIp, status: devStatus });
    }, hbInterval);
    await sendHeartbeat({ deviceId, deviceIp, status: devStatus }); // fire immediately

    // Op polling loop
    let lastOp = null;
    const opTimer = setInterval(async () => {
      try {
        const op = await getOp(deviceId);
        if (op !== lastOp) {
          console.log(`[device-sim] operation changed: ${lastOp ?? "null"} -> ${op ?? "null"}`);
          lastOp = op;
        }
      } catch (e) {
        console.error("[device-sim] op poll error:", e.message);
      }
    }, opPoll);

    // REPL stdin
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.setPrompt("> ");
    rl.prompt();

    rl.on("line", async (line) => {
      const [c, ...rest] = line.trim().split(/\s+/);
      if (!c) return rl.prompt();

      try {
        if (c === "help") {
          printUsage();
        } else if (c === "quit" || c === "exit") {
          rl.close();
        } else if (c === "get") {
          const op = await getOp(deviceId);
          console.log(`[device-sim] ${deviceId} = ${op ?? "null"}`);
        } else if (c === "set") {
          const raw = rest[0];
          if (!raw) {
            console.log("usage: set <operation>");
          } else {
            const op = await setOp(deviceId, raw);
            console.log(`[device-sim] set ${deviceId} -> ${op} : OK`);
          }
        } else if (c === "status") {
          const s = (rest[0] || "").toLowerCase();
          if (!["online", "maintenance", "fault"].includes(s)) {
            console.log("usage: status <online|maintenance|fault>");
          } else {
            devStatus = s;
            console.log(`[device-sim] status = ${devStatus}`);
            await sendHeartbeat({ deviceId, deviceIp, status: devStatus });
          }
        } else if (c === "probe" && probe) {
          const sub = (rest[0] || "").toLowerCase();
          if (sub === "on") await probe.on();
          else if (sub === "off") await probe.off();
          else if (sub === "toggle") await probe.toggle();
          else console.log("usage: probe on|off|toggle");
        } else {
          console.log("unknown cmd. type: help");
        }
      } catch (e) {
        console.error("[device-sim] cmd error:", e.message);
      }

      rl.prompt();
    });

    rl.on("close", () => {
      clearInterval(hbTimer);
      clearInterval(opTimer);
      if (probe) probe.off().catch(() => {});
      console.log("[device-sim] stopped");
      process.exit(0);
    });

    return;
  }

  printUsage();
}

main().catch((e) => {
  console.error("[device-sim] fatal:", e);
  process.exit(1);
});
