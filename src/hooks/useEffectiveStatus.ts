// src/hooks/useEffectiveStatus.ts
import { useEffect, useRef, useState } from "react";
import type { Device } from "@/models/device";
import {
  computeEffectiveStatus,
  type EffectiveStatus,
  type ProbeResult,
  isOnline,
} from "@/utils/effectiveStatus";

type HbSummary = {
  status: "online" | "stale" | "offline";
  agoText: string;
};

type State = {
  status: EffectiveStatus;
  hb: HbSummary;
  probe?: ProbeResult;
};

type Options = {
  pollingMs?: number;
  staleMs?: number;
  offlineMs?: number;
  tcpPort?: number;
  timeoutMs?: number;
  /** key สำหรับ debug log เช่น `"modal:G1-01:Entry Reader"` */
  logKey?: string;
};

/** ใช้ได้แม้ device = null (จะคืน offline เฉย ๆ) เพื่อกัน React hooks order ผิดพลาด */
export default function useEffectiveStatus(device: Device | null | undefined, opts?: Options): State {
  const [state, setState] = useState<State>(() => ({
    status: "offline",
    hb: { status: "offline", agoText: "-" },
    probe: undefined,
  }));

  const timerRef = useRef<number | null>(null);
  const pollingMs = Math.max(1000, opts?.pollingMs ?? 6000);

  // ฟังก์ชันวิ่ง 1 รอบ
  const runOnce = async () => {
    if (!device) return;

    const started = performance.now();
    window.logger?.debug?.(
      `[useEffectiveStatus:${opts?.logKey ?? device.id}] probe:start`,
      {
        deviceId: device.id,
        ip: device.deviceIp,
        tcpPort: opts?.tcpPort ?? 22,
        timeoutMs: opts?.timeoutMs ?? 1200,
        staleMs: opts?.staleMs ?? 60_000,
        offlineMs: opts?.offlineMs ?? 300_000,
      }
    );

    const { status, hb, probe } = await computeEffectiveStatus(device, opts);
    const took = Math.round(performance.now() - started);

    setState(prev => {
      const changed = !prev || prev.status !== status;
      window.logger?.debug?.(
        `[useEffectiveStatus:${opts?.logKey ?? device.id}] ${changed ? "status:changed" : "status:same"}`,
        {
          deviceId: device.id,
          status,
          hbStatus: hb.status,
          probeOk: !!probe?.ok,
          reachable: probe?.ok ? probe.reachable : undefined,
          rttMs: probe?.ok ? probe.rttMs : undefined,
          reason: changed ? `from ${prev?.status ?? "(none)"} → ${status}` : "no change",
        }
      );
      window.logger?.debug?.(
        `[useEffectiveStatus:${opts?.logKey ?? device.id}] probe:done`,
        { tookMs: took }
      );
      return { status, hb, probe };
    });
  };

  // ตั้ง interval
  useEffect(() => {
    // เคลียร์ตัวเก่า (ถ้ามี)
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // ถ้าไม่มี device ก็หยุดที่นี่แต่คง state เดิมไว้
    if (!device) return;

    // ยิงทันที 1 รอบ
    runOnce();

    // แล้วตั้ง interval
    timerRef.current = window.setInterval(runOnce, pollingMs) as unknown as number;

    // cleanup
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // ใช้ id/ip/logKey และช่วงเวลาเป็น dependency
  }, [device?.id, device?.deviceIp, pollingMs, opts?.staleMs, opts?.offlineMs, opts?.tcpPort, opts?.timeoutMs, opts?.logKey]);

  return state;
}

// re-export helpers เผื่อใช้งานนอก hook
export { isOnline } from "@/utils/effectiveStatus";
export type { EffectiveStatus, ProbeResult } from "@/utils/effectiveStatus";
