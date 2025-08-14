// src/utils/deviceHeartBeatCheck.ts

import type { DeviceStatus } from "@/utils/status";

export type HBStatus = "online" | "stale" | "offline";

export type HeartbeatSummary = {
  status: HBStatus;
  agoMs: number;
  agoText: string;
};

function fmtAgo(ms: number) {
  if (!isFinite(ms)) return "-";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

export function summarizeHeartbeat(
  deviceStatus: DeviceStatus,
  lastHeartbeat?: string,
  opts?: { staleMs?: number; offlineMs?: number }
): HeartbeatSummary {
  const staleMs = opts?.staleMs ?? 60_000;
  const offlineMs = opts?.offlineMs ?? 300_000;

  let status: HBStatus = "offline";
  let agoMs = Number.POSITIVE_INFINITY;

  if (lastHeartbeat) {
    const last = new Date(lastHeartbeat).getTime();
    agoMs = Math.max(0, Date.now() - last);
    if (agoMs <= staleMs) status = "online";
    else if (agoMs <= offlineMs) status = "stale";
    else status = "offline";
  }

  return { status, agoMs, agoText: fmtAgo(agoMs) };
}
