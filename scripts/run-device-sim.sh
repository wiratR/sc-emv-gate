#!/usr/bin/env bash
set -euo pipefail

# Default HB host (override ได้ด้วย env HB_HOST)
HB_HOST_DEFAULT="http://127.0.0.1:3070"

# Resolve paths
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SIM="$SCRIPT_DIR/scripts/device-sim.mjs"

# Checks
if ! command -v node >/dev/null 2>&1; then
  echo "error: Node.js not found. Install Node >=18."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "error: Node.js >=18 required (found $(node -v))."
  exit 1
fi

if [ ! -f "$SIM" ]; then
  echo "error: device-sim not found at $SIM"
  exit 1
fi

usage() {
  cat <<EOF
Usage:
  ${0##*/} run [args...]               # pass-through to device-sim.mjs
  ${0##*/} multi --count N [--prefix G] [--start 1] [--ip-base 127.0.0] [--probe-port 2222] [--hb 5000] [--op 2000]
  ${0##*/} get <id> | set <id> <op> | get-aisle <id> | set-aisle <id> <0|1|2|3>
  ${0##*/} stop                         # stop all background sims started by 'multi'

Env:
  HB_HOST  (default $HB_HOST_DEFAULT)

Examples:
  ${0##*/} run --id G1-01 --ip 127.0.0.1 --probe-port 2222 --probe on
  ${0##*/} get G1-01
  ${0##*/} multi --count 3 --prefix G1- --start 1 --ip-base 127.0.0 --probe-port 2222
EOF
}

STATE_DIR="$SCRIPT_DIR/.sim-state"
PIDFILE="$STATE_DIR/pids.txt"
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$STATE_DIR" "$LOG_DIR"

cmd="${1:-}"
shift || true

HB_HOST="${HB_HOST:-$HB_HOST_DEFAULT}"

case "$cmd" in
  run)
    exec env HB_HOST="$HB_HOST" node "$SIM" run "$@"
    ;;

  get|get-aisle|set|set-aisle)
    sub="$cmd"
    exec env HB_HOST="$HB_HOST" node "$SIM" "$sub" "$@"
    ;;

  multi)
    # defaults
    COUNT=1; PREFIX="G1-"; START=1; IP_BASE="127.0.0"; PROBE_BASE=2222; HB=5000; OP=2000
    while [ $# -gt 0 ]; do
      case "$1" in
        --count) COUNT="$2"; shift 2;;
        --prefix) PREFIX="$2"; shift 2;;
        --start) START="$2"; shift 2;;
        --ip-base) IP_BASE="$2"; shift 2;;
        --probe-port) PROBE_BASE="$2"; shift 2;;
        --hb) HB="$2"; shift 2;;
        --op) OP="$2"; shift 2;;
        *) echo "unknown option: $1"; usage; exit 2;;
      esac
    done

    : > "$PIDFILE"
    for ((i=0;i<COUNT;i++)); do
      n=$((START + i))
      id=$(printf "%s%02d" "$PREFIX" "$n")
      ip="${IP_BASE}.${n}"
      port=$((PROBE_BASE + i))
      log="$LOG_DIR/${id}.log"
      echo "▶ starting $id ip=$ip probe=$port (logs: $log)"
      nohup env HB_HOST="$HB_HOST" node "$SIM" run \
        --id "$id" --ip "$ip" \
        --probe-port "$port" --probe on \
        --hb-interval "$HB" --op-poll "$OP" >>"$log" 2>&1 &
      echo $! >> "$PIDFILE"
    done
    echo "Done. Background PIDs saved to $PIDFILE"
    ;;

  stop)
    if [ -f "$PIDFILE" ]; then
      while IFS= read -r pid; do
        [ -z "$pid" ] && continue
        if kill "$pid" 2>/dev/null; then
          echo "✓ killed $pid"
        fi
      done < "$PIDFILE"
      rm -f "$PIDFILE"
    else
      echo "no pid file at $PIDFILE"
    fi
    ;;

  ""|-h|--help|help)
    usage
    ;;

  *)
    echo "Unknown command: $cmd"
    usage
    exit 2
    ;;
esac
