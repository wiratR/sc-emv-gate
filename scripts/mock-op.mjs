// node >= 18
const host = process.env.HB_HOST || 'http://127.0.0.1:3070';

const OPS = new Set([
  'inservice_entry',
  'inservice_exit',
  'inservice_bidirect',
  'out_of_service',
  'station_close',
  'emergency'
]);

async function setOp(deviceId, op) {
  if (!OPS.has(op)) {
    console.error(`[mock-op] invalid operation: ${op}`);
    process.exit(2);
  }
  const res = await fetch(`${host}/operation/${encodeURIComponent(deviceId)}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ operation: op })
  });
  const j = await res.json();
  if (!j.ok) {
    console.error('[mock-op] failed:', j);
    process.exit(1);
  }
  console.log(`[mock-op] set ${deviceId} -> ${op} : OK`);
}

async function getOp(deviceId) {
  const res = await fetch(`${host}/operation/${encodeURIComponent(deviceId)}`);
  const j = await res.json();
  if (!j.ok) {
    console.error('[mock-op] failed:', j);
    process.exit(1);
  }
  console.log(`[mock-op] ${deviceId} = ${j.operation ?? 'null'}`);
}

async function main() {
  const [cmd, deviceId, op] = process.argv.slice(2);
  if (!cmd || !deviceId) {
    console.log('Usage: node scripts/mock-op.mjs <set|get> <deviceId> [operation]');
    process.exit(0);
  }
  if (cmd === 'set') {
    if (!op) {
      console.error('operation is required');
      process.exit(2);
    }
    await setOp(deviceId, op);
  } else if (cmd === 'get') {
    await getOp(deviceId);
  } else {
    console.error('unknown command:', cmd);
    process.exit(2);
  }
}

main().catch(e => {
  console.error('[mock-op] error:', e);
  process.exit(1);
});
