#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-2222}"
echo "[mock-probe] listening TCP on 0.0.0.0:${PORT}"
# ต้องมี netcat (nc) ติดตั้งไว้
nc -lk 0.0.0.0 "$PORT"
