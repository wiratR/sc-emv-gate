// src/utils/effectiveStatus.ts
import type { Device } from "@/models/device";
import { summarizeHeartbeat } from "@/utils/deviceHeartBeatCheck";

export type EffectiveStatus = "online" | "offline" | "stale" | "fault" | "maintenance";

export type ProbeResultOk  = { ok: true; reachable: boolean; rttMs: number };
export type ProbeResultErr = { ok: false; error: string };
export type ProbeResult    = ProbeResultOk | ProbeResultErr;

export async function computeEffectiveStatus(
  device: Device,
  opts?: { staleMs?: number; offlineMs?: number; tcpPort?: number; timeoutMs?: number }
) {
  const hb = summarizeHeartbeat(device.status, device.lastHeartbeat, {
    staleMs: opts?.staleMs ?? 60_000,
    offlineMs: opts?.offlineMs ?? 300_000,
  });

  let probe: ProbeResult | undefined;
  if (device.deviceIp && window.devices?.probe) {
    try {
      probe = await window.devices.probe(
        device.deviceIp,
        opts?.tcpPort ?? 22,
        opts?.timeoutMs ?? 1200
      );
    } catch (e: any) {
      probe = { ok: false, error: String(e?.message ?? e) };
    }
  }

  let status: EffectiveStatus;

  if (device.status === "maintenance") {
    status = "maintenance";
  } else if (hb.status === "offline") {
    // นโยบายที่เลือก: HB offline แต่ probe ต่อถึง => fault
    status = probe?.ok ? (probe.reachable ? "fault" : "offline") : "offline";
  } else if (hb.status === "stale") {
    // stale แล้ว probe ตัดสินออนไลน์/ออฟไลน์ได้
    status = probe?.ok ? (probe.reachable ? "online" : "offline") : "stale";
  } else {
    // hb online → ถ้า probe ไม่ถึง ให้เป็น fault
    status = probe?.ok && !probe.reachable ? "fault" : "online";
  }

  return { status, hb, probe };
}

export const isOnline = (s: EffectiveStatus) => s === "online";
export const canControlByStatus = isOnline;
