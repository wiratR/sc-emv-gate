#!/usr/bin/env bash
set -Eeuo pipefail

# ─────────────────────────────────────────────────────────────
# Reset Node/Electron dev env, reinstall, then start dev.
# macOS / Linux / (Git-Bash on Windows)
# ─────────────────────────────────────────────────────────────

ROOT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )"/.. &>/dev/null && pwd )"
cd "$ROOT_DIR"

echo "🔧 Workspace: $ROOT_DIR"
echo "This will remove: node_modules, dist, dist-electron, out, dist-*, .vite"
read -rp "Continue? [y/N] " ans
[[ "${ans:-}" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

echo "🧹 Cleaning..."
rm -rf node_modules dist dist-electron out dist-* .vite

# (ทางเลือก) ลบ cache ของ Electron/electron-builder แบบ best-effort
case "$(uname -s)" in
  Darwin)
    rm -rf "$HOME/Library/Caches/electron" \
           "$HOME/Library/Caches/electron-builder" || true
    ;;
  Linux)
    rm -rf "$HOME/.cache/electron" \
           "$HOME/.cache/electron-builder" || true
    ;;
  MINGW*|MSYS*|CYGWIN*|Windows_NT)
    # สำหรับ Git-Bash บน Windows (ตัวแปร LOCALAPPDATA อาจว่าง ให้ข้ามได้)
    if [[ -n "${LOCALAPPDATA:-}" ]]; then
      rm -rf "$LOCALAPPDATA/electron/Cache" \
             "$LOCALAPPDATA/electron-builder/Cache" || true
    fi
    ;;
esac

echo "📦 Installing dependencies (npm ci)…"
# ใช้ lockfile ที่มีอยู่ เพื่อความ reproducible
npm ci

# Rebuild native modules ให้ตรงกับ Electron (เฉพาะโลคัล; CI มักให้ electron-builder ทำเอง)
if [[ -z "${CI:-}" ]]; then
  echo "🔩 Rebuilding native modules…"
  npm run rebuild || npx --yes @electron/rebuild -f -w better-sqlite3 -w node-pty || true
fi

echo "🚀 Starting dev server…"
npm run dev
