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

function normalizeInservice(modeRaw) {
  const m = String(modeRaw ?? "bi").trim().toLowerCase();
  if (m.startsWith("en") || m === "entry" || m === "in:entry" || m === "in-entry") return "inservice_entry";
  if (m.startsWith("ex") || m === "exit" || m === "in:exit" || m === "in-exit") return "inservice_exit";
  return "inservice_bidirect";
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

async function setInservice(deviceId, modeRaw) {
  const op = normalizeInservice(modeRaw); // -> inservice_entry|exit|bidirect
  return await setOp(deviceId, op);
}

/** ----- Aisle Mode GET/POST (0..3) ----- */
function isAisleMode(n) {
  const x = Number(n);
  return Number.isInteger(x) && x >= 0 && x <= 3;
}
function labelAisle(n) {
  const map = {
    0: "0 — Normally closed, no flap restriction",
    1: "1 — Normally open",
    2: "2 — Normally closed, left flap only",
    3: "3 — Normally closed, right flap only",
  };
  return map[n] ?? String(n);
}

async function getAisle(deviceId) {
  const res = await fetch(`${HOST}/aisle-mode/${encodeURIComponent(deviceId)}`);
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(`GET aisle-mode failed: ${res.status} ${JSON.stringify(j)}`);
  return typeof j.aisleMode === "number" ? j.aisleMode : null;
}

async function setAisle(deviceId, mode) {
  const n = Number(mode);
  if (!isAisleMode(n)) throw new Error(`invalid aisleMode: "${mode}" (must be 0..3)`);
  const res = await fetch(`${HOST}/aisle-mode/${encodeURIComponent(deviceId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aisleMode: n }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(`SET aisle-mode failed: ${res.status} ${JSON.stringify(j)}`);
  return n;
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
        socket.on("error", () => {});
        socket.on("data", () => {});
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
  node scripts/device-sim.mjs run --id G1-01 --ip 127.0.0.1 [--status online|maintenance|fault] [--hb-interval 5000] [--op-poll 2000] [--probe-port 2222] [--probe on|off] [--inservice entry|exit|bi] [--no-inservice]
  node scripts/device-sim.mjs get <deviceId>                # get current operation
  node scripts/device-sim.mjs set <deviceId> <operation>    # set operation
  node scripts/device-sim.mjs get-aisle <deviceId>          # get aisle mode (0..3)
  node scripts/device-sim.mjs set-aisle <deviceId> <0|1|2|3># set aisle mode

Notes:
  - By default, "run" will POST an inservice operation immediately (inservice_bidirect).
  - Override with --inservice entry|exit|bi or disable via --no-inservice.

While running "run" mode, you can type commands:
  set <op>                 set operation (aliases ok: in:entry, in:exit, bi, oos, close, emer)
  inservice [entry|exit|bi]  quick set inservice mode (default bi)
  get                      get current operation
  aisle                    get aisle mode
  aisle <0|1|2|3>          set aisle mode quickly
  aisle set <0..3>         set aisle mode explicitly
  status <s>               change device status (online|maintenance|fault)
  probe on|off|toggle
  help                     show this help
  quit/exit                stop simulator

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

  // ✅ new: top-level aisle getters/setters
  if (cmd === "get-aisle") {
    if (!a1) return printUsage();
    const am = await getAisle(a1);
    console.log(`[device-sim] aisle-mode ${a1} = ${am ?? "null"}${am != null ? ` (${labelAisle(am)})` : ""}`);
    return;
  }

  if (cmd === "set-aisle") {
    if (!a1 || typeof a2 === "undefined") return printUsage();
    const n = await setAisle(a1, a2);
    console.log(`[device-sim] set aisle-mode ${a1} -> ${n} (${labelAisle(n)}) : OK`);
    return;
  }

  if (cmd === "run") {
    const deviceId = args.id || a1 || "G1-01";
    const deviceIp = args.ip || "127.0.0.1";
    let devStatus = (args.status || "online").toLowerCase(); // online|maintenance|fault
    const hbInterval = Number(args["hb-interval"] || 5000);
    const opPoll = Number(args["op-poll"] || 2000);

    const inserviceMode = args["inservice"] || "bi";
    const autoInservice = !args["no-inservice"]; // default true

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
    console.log(`[device-sim] auto inservice: ${autoInservice ? normalizeInservice(inserviceMode) : "DISABLED"}`);

    // HB loop
    const hbTimer = setInterval(() => {
      void sendHeartbeat({ deviceId, deviceIp, status: devStatus });
    }, hbInterval);
    await sendHeartbeat({ deviceId, deviceIp, status: devStatus }); // fire immediately

    // 🚀 POST inservice right away (unless disabled)
    if (autoInservice && devStatus === "online") {
      try {
        const op = await setInservice(deviceId, inserviceMode);
        console.log(`[device-sim] POST inservice on start -> ${op} : OK`);
      } catch (e) {
        console.error("[device-sim] post inservice error:", e.message);
      }
    }

    // Initial reads
    try {
      const op0 = await getOp(deviceId);
      console.log(`[device-sim] initial operation: ${op0 ?? "null"}`);
    } catch (e) {
      console.error("[device-sim] initial op error:", e.message);
    }
    try {
      const am0 = await getAisle(deviceId);
      console.log(`[device-sim] initial aisle-mode: ${am0 ?? "null"}${am0 != null ? ` (${labelAisle(am0)})` : ""}`);
    } catch (e) {
      console.error("[device-sim] initial aisle error:", e.message);
    }

    // Poll both op and aisle-mode
    let lastOp = null;
    let lastAisle = null;
    const pollTimer = setInterval(async () => {
      try {
        const op = await getOp(deviceId);
        if (op !== lastOp) {
          console.log(`[device-sim] operation changed: ${lastOp ?? "null"} -> ${op ?? "null"}`);
          lastOp = op;
        }
      } catch (e) {
        console.error("[device-sim] op poll error:", e.message);
      }
      try {
        const am = await getAisle(deviceId);
        if (am !== lastAisle) {
          console.log(`[device-sim] aisle-mode changed: ${lastAisle ?? "null"} -> ${am ?? "null"}${am != null ? ` (${labelAisle(am)})` : ""}`);
          lastAisle = am;
        }
      } catch (e) {
        console.error("[device-sim] aisle poll error:", e.message);
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
        } else if (c === "inservice") {
          const m = rest[0] || "bi";
          const op = await setInservice(deviceId, m);
          console.log(`[device-sim] inservice -> ${op} : OK`);
        } else if (c === "aisle") {
          // aisle / aisle get / aisle 2 / aisle set 2
          const sub = (rest[0] || "").toLowerCase();
          if (!sub || sub === "get") {
            const am = await getAisle(deviceId);
            console.log(`[device-sim] aisle-mode ${deviceId} = ${am ?? "null"}${am != null ? ` (${labelAisle(am)})` : ""}`);
          } else if (sub === "set") {
            const val = rest[1];
            if (typeof val === "undefined" || !isAisleMode(val)) {
              console.log("usage: aisle set <0|1|2|3>");
            } else {
              const n = await setAisle(deviceId, Number(val));
              console.log(`[device-sim] set aisle-mode ${deviceId} -> ${n} (${labelAisle(n)}) : OK`);
            }
          } else if (isAisleMode(sub)) {
            const n = await setAisle(deviceId, Number(sub));
            console.log(`[device-sim] set aisle-mode ${deviceId} -> ${n} (${labelAisle(n)}) : OK`);
          } else {
            console.log("usage: aisle [get]|<0|1|2|3>|set <0|1|2|3>");
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
      clearInterval(pollTimer);
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
