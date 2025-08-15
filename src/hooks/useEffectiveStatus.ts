// src/hooks/useEffectiveStatus.ts

import { useEffect, useMemo, useRef, useState } from "react";

import type { Device } from "@/models/device";
import type { EffectiveStatus } from "@/utils/status";
import { summarizeHeartbeat } from "@/utils/deviceHeartBeatCheck";

// ───────────────── types ─────────────────
export type ProbeOk  = { ok: true; reachable: boolean; rttMs: number };
export type ProbeErr = { ok: false; error: string };
export type Probe    = ProbeOk | ProbeErr;

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

// ───────────────── shared decision logic ─────────────────
export function decideEffectiveStatus(
  hbStatus: "online" | "offline" | "stale",
  probe?: Probe,
  deviceStatus?: string
): EffectiveStatus {
  if (deviceStatus === "maintenance") return "maintenance";

  if (hbStatus === "offline") {
    if (probe && "reachable" in probe) {
      // “สูตร A”: offline + reachable => fault
      return probe.reachable ? "fault" : "offline";
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
}

// one-shot สำหรับอุปกรณ์เดี่ยว (ใช้ใน summary ให้ logic ตรงกัน)
export async function oneShotEffective(
  device: Device,
  opts?: Options
): Promise<{ status: EffectiveStatus; hb: ReturnType<typeof summarizeHeartbeat>; probe?: Probe }> {
  const cfg = { ...DEFAULTS, ...(opts || {}) };

  const hb = summarizeHeartbeat(device.status, device.lastHeartbeat, {
    staleMs: cfg.staleMs,
    offlineMs: cfg.offlineMs,
  });

  let probe: Probe | undefined;
  if (device.deviceIp && window.devices?.probe) {
    try {
      const r = await window.devices.probe(device.deviceIp, cfg.tcpPort, cfg.timeoutMs);
      probe = r;
    } catch (e: any) {
      probe = { ok: false, error: String(e?.message ?? e) };
    }
  }

  const status = decideEffectiveStatus(hb.status, probe, device.status);
  return { status, hb, probe };
}

// ───────────────── main hook (ต่อเนื่อง/auto-refresh) ─────────────────
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

  const runOnce = async (round: number) => {
    if (!device) {
      setState(s => ({ ...s, status: "offline", hb: null, probe: undefined }));
      return;
    }

    const start = Date.now();

    if (device.deviceIp) {
      window.logger?.debug?.(
        `[renderer] [${label}] tick:${round}: start`,
        {
          deviceId: device.id,
          ip: device.deviceIp,
          tcpPort: cfg.tcpPort,
          timeoutMs: cfg.timeoutMs,
          staleMs: cfg.staleMs,
          offlineMs: cfg.offlineMs
        }
      );
    }

    const { status: nextStatus, hb, probe } = await oneShotEffective(device, cfg);

    const prev = lastStatusRef.current;
    if (prev !== nextStatus) {
      window.logger?.debug?.(
        `[renderer] [${label}] tick:${round}: status:changed`,
        {
          deviceId: device.id,
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
          deviceId: device.id,
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
      void runOnce(round);
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
      void runOnce(next);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device?.id, device?.deviceIp, device?.status, device?.lastHeartbeat, label]);

  useEffect(() => {
    setState(s => ({ ...s, refreshNow }));
  }, [refreshNow]);

  return state;
}

// helper แบบเดิม
export const isOnline = (s: EffectiveStatus) => s === "online";

// ───────────────── named export: useEffectiveSummary (สำหรับหน้า Home) ─────────────────
export type EffectiveCounts = {
  total: number;
  online: number;
  maintenance: number;
  fault: number;
  stale: number;
  offline: number;
};

export type EffectiveItem = Device & {
  effective: EffectiveStatus;
  hb: ReturnType<typeof summarizeHeartbeat>;
  probe?: Probe;
};

export function useEffectiveSummary(
  devices?: Device[],
  opts?: Options & { includeList?: boolean }
) {
  const cfg = { ...DEFAULTS, ...(opts || {}) };
  const label = opts?.label || "useEff:summary";

  const [tick, setTick] = useState(0);
  const [counts, setCounts] = useState<EffectiveCounts>({
    total: 0, online: 0, maintenance: 0, fault: 0, stale: 0, offline: 0,
  });
  const [list, setList] = useState<EffectiveItem[]>([]);

  const stopRef = useRef<() => void>();

  const runOnce = async (round: number) => {
    const arr = devices ?? [];
    if (arr.length === 0) {
      setCounts({ total: 0, online: 0, maintenance: 0, fault: 0, stale: 0, offline: 0 });
      if (opts?.includeList) setList([]);
      return;
    }

    window.logger?.debug?.(`[renderer] [${label}] tick:${round}: summary:start`, { size: arr.length });

    const results = await Promise.all(
      arr.map(async (d) => {
        const { status, hb, probe } = await oneShotEffective(d, cfg);
        return { device: d, status, hb, probe };
      })
    );

    const c: EffectiveCounts = { total: arr.length, online: 0, maintenance: 0, fault: 0, stale: 0, offline: 0 };
    const l: EffectiveItem[] = [];

    for (const r of results) {
      c[r.status] += 1 as any;
      if (opts?.includeList) {
        l.push({ ...r.device, effective: r.status, hb: r.hb, probe: r.probe });
      }
    }

    setCounts(c);
    if (opts?.includeList) setList(l);

    window.logger?.debug?.(
      `[renderer] [${label}] tick:${round}: summary:end`,
      { counts: c }
    );
  };

  useEffect(() => {
    let round = 0;
    let stopped = false;

    const tickFn = () => {
      if (stopped) return;
      round += 1;
      setTick(round);
      void runOnce(round);
    };

    tickFn(); // run now

    if (cfg.refreshMs > 0) {
      const id = setInterval(tickFn, cfg.refreshMs);
      stopRef.current = () => { stopped = true; clearInterval(id); };
      return () => { stopped = true; clearInterval(id); };
    } else {
      stopRef.current = () => { stopped = true; };
      return () => { stopped = true; };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // เปลี่ยน device list/fields สำคัญให้รีเฟรช
    JSON.stringify((devices ?? []).map(d => [d.id, d.deviceIp, d.status, d.lastHeartbeat])),
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
      const next = tick + 1;
      setTick(next);
      void runOnce(next);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, devices?.length, label]);

  return { counts, list: opts?.includeList ? list : undefined, tick, refreshNow };
}
