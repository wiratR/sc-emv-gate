#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-http://127.0.0.1:3070}"
ID="${2:-G1-01}"
IP="${3:-192.168.1.101}"
SIDE="${4:-north}"
GATE="${5:-G1}"
TYPE="${6:-entry}"
INTERVAL="${7:-5}"   # วินาที

send_hb() {
  local status="$1"
  curl -sS -X POST "$HOST/hb" -H 'Content-Type: application/json' -d "{
    \"id\":\"$ID\",
    \"ip\":\"$IP\",
    \"side\":\"$SIDE\",
    \"gateId\":\"$GATE\",
    \"type\":\"$TYPE\",
    \"status\":\"$status\",
    \"ts\":\"$(date -u +%FT%TZ)\"
  }" >/dev/null
  echo "[mock-hb] sent: id=$ID status=$status @ $(date -u +%T)Z"
}

trap 'echo; echo "[mock-hb] stop"; exit 0' INT TERM

echo "[mock-hb] loop → $HOST id=$ID ip=$IP every ${INTERVAL}s"
while true; do
  send_hb "online"
  sleep "$INTERVAL"
done
