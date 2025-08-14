// src/hooks/useEffectiveStatus.ts
import { useEffect, useMemo, useRef, useState } from "react";

import type { Device } from "@/models/device";
import type { EffectiveStatus } from "@/utils/status";
import { summarizeHeartbeat } from "@/utils/deviceHeartBeatCheck";

type ProbeOk  = { ok: true; reachable: boolean; rttMs: number };
type ProbeErr = { ok: false; error: string };
type Probe    = ProbeOk | ProbeErr;

type Options = {
  label?: string;
  refreshMs?: number;
  staleMs?: number;
  offlineMs?: number;
  tcpPort?: number;
  timeoutMs?: number;
};

type State = {
  status: EffectiveStatus;
  hb: ReturnType<typeof summarizeHeartbeat> | null;
  probe?: Probe;
  tick: number;
  refreshNow: () => void;
};

const DEFAULTS: Required<Pick<Options,"refreshMs"|"staleMs"|"offlineMs"|"tcpPort"|"timeoutMs">> = {
  refreshMs: 6000,
  staleMs:   60_000,
  offlineMs: 300_000,
  tcpPort:   22,
  timeoutMs: 1200,
};

export default function useEffectiveStatus(
  device?: Device,
  opts?: Options
): State {
  const cfg = { ...DEFAULTS, ...(opts || {}) };
  const label = opts?.label || "useEff";

  const [state, setState] = useState<State>({
    status: "offline",
    hb: null,
    probe: undefined,
    tick: 0,
    refreshNow: () => {},
  });

  const lastStatusRef = useRef<EffectiveStatus | null>(null);
  const stopRef = useRef<() => void>();

  const computeStatus = (
    hbStatus: "online" | "offline" | "stale",
    probe?: Probe,
    deviceStatus?: string
  ): EffectiveStatus => {
    if (deviceStatus === "maintenance") return "maintenance";

    if (hbStatus === "offline") {
      if (probe && "reachable" in probe) {
        return probe.reachable ? "fault" : "offline"; // ✅ แนว A
      }
      return "offline";
    }

    if (hbStatus === "stale") {
      if (probe && "reachable" in probe) {
        return probe.reachable ? "online" : "offline";
      }
      return "stale";
    }

    // hb online
    if (probe && "reachable" in probe && !probe.reachable) return "fault";
    return "online";
  };

  const runOnce = async (round: number) => {
    if (!device) {
      setState(s => ({ ...s, status: "offline", hb: null, probe: undefined }));
      return;
    }

    const { id, lastHeartbeat, status: rawStatus, deviceIp } = device;

    const hb = summarizeHeartbeat(rawStatus, lastHeartbeat, {
      staleMs: cfg.staleMs,
      offlineMs: cfg.offlineMs,
    });

    let probe: Probe | undefined = undefined;
    const start = Date.now();
    if (deviceIp && window.devices?.probe) {
      window.logger?.debug?.(
        `[renderer] [${label}] tick:${round}: start`,
        { deviceId: id, ip: deviceIp, tcpPort: cfg.tcpPort, timeoutMs: cfg.timeoutMs, staleMs: cfg.staleMs, offlineMs: cfg.offlineMs }
      );
      try {
        const pr = await window.devices.probe(deviceIp, cfg.tcpPort, cfg.timeoutMs);
        probe = pr;
      } catch (e: any) {
        probe = { ok: false, error: String(e?.message ?? e) };
      }
    }

    const nextStatus = computeStatus(hb.status, probe, rawStatus);

    const prev = lastStatusRef.current;
    if (prev !== nextStatus) {
      window.logger?.debug?.(
        `[renderer] [${label}] tick:${round}: status:changed`,
        {
          deviceId: id,
          status: nextStatus,
          hbStatus: hb.status,
          probeOk: !!(probe && "ok" in probe && probe.ok),
          reachable: (probe && "reachable" in probe) ? probe.reachable : undefined,
          rttMs: (probe && "reachable" in probe) ? probe.rttMs : undefined,
          reason: `from ${prev ?? "n/a"} → ${nextStatus}`
        }
      );
      lastStatusRef.current = nextStatus;
    } else {
      window.logger?.debug?.(
        `[renderer] [${label}] tick:${round}: status:same`,
        {
          deviceId: id,
          status: nextStatus,
          hbStatus: hb.status,
          probeOk: !!(probe && "ok" in probe && probe.ok),
          reachable: (probe && "reachable" in probe) ? probe.reachable : undefined,
          rttMs: (probe && "reachable" in probe) ? probe.rttMs : undefined,
          reason: "no change"
        }
      );
    }

    window.logger?.debug?.(
      `[renderer] [${label}] tick:${round}: end`,
      { tookMs: Date.now() - start }
    );

    setState(s => ({ ...s, status: nextStatus, hb, probe }));
  };

  useEffect(() => {
    let round = 0;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      round += 1;
      setState(s => ({ ...s, tick: round }));
      runOnce(round);
    };

    tick(); // run now

    if (cfg.refreshMs > 0) {
      const id = setInterval(tick, cfg.refreshMs);
      stopRef.current = () => { stopped = true; clearInterval(id); };
      return () => { stopped = true; clearInterval(id); };
    } else {
      stopRef.current = () => { stopped = true; };
      return () => { stopped = true; };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    device?.id,
    device?.deviceIp,
    device?.status,
    device?.lastHeartbeat,
    cfg.refreshMs,
    cfg.staleMs,
    cfg.offlineMs,
    cfg.tcpPort,
    cfg.timeoutMs,
    label
  ]);

  const refreshNow = useMemo(() => {
    return () => {
      stopRef.current?.();
      const next = (state.tick ?? 0) + 1;
      setState(s => ({ ...s, tick: next }));
      runOnce(next);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device?.id, device?.deviceIp, device?.status, device?.lastHeartbeat, label]);

  useEffect(() => {
    setState(s => ({ ...s, refreshNow }));
  }, [refreshNow]);

  return state;
}

// เผื่อมีที่ไหนยัง import ชื่อฟังก์ชันนี้จาก hook (ไม่บังคับใช้)
export const isOnline = (s: EffectiveStatus) => s === "online";
