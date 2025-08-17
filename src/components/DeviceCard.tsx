// src/components/DeviceCard.tsx
import { useCallback, useEffect, useMemo, useState } from "react";

import { Device } from "@/models/device";
import { sideLabel } from "@/utils/side";
import { statusClass } from "@/utils/status";
import useEffectiveStatus from "@/hooks/useEffectiveStatus";
import { useI18n } from "@/i18n/I18nProvider";
import useProbePort from "@/hooks/useProbePort";

/** Operation values agreed with main/heartbeatServer */
type Operation =
  | "inservice_entry"
  | "inservice_exit"
  | "inservice_bidirect"
  | "out_of_service"
  | "station_close"
  | "emergency";

type Props = {
  device: Device;
  onClick?: (d: Device) => void;
};

export default function DeviceCard({ device, onClick }: Props) {
  const { t, lang } = useI18n();
  const probePort = useProbePort(22); // default 22; override by config if exists
  const labelCls = "font-bold text-gray-700";

  // ── Effective status (HB + TCP probe) ─────────────────────────
  const { status, hb, probe } = useEffectiveStatus(device, {
    label: `card:${device.id}:${device.gateId ?? device.name}`,
    refreshMs: 8000,
    tcpPort: probePort,
    timeoutMs: 1200,
    staleMs: 60_000,
    offlineMs: 300_000,
  });

  // ── Current Operation (poll every 10s) ────────────────────────
  const [op, setOp] = useState<Operation | null>(null);
  const [opLoading, setOpLoading] = useState(false);

  const fetchOperation = useCallback(async () => {
    if (!device?.id || !window.devices?.getCurrentOperation) return;
    try {
      setOpLoading(true);
      const res = await window.devices.getCurrentOperation(device.id);
      if (res?.ok) setOp((res.operation as Operation | null) ?? null);
    } catch {
      /* noop */
    } finally {
      setOpLoading(false);
    }
  }, [device?.id]);

  useEffect(() => {
    let alive = true;
    (async () => alive && (await fetchOperation()))();
    const itv = setInterval(() => alive && fetchOperation(), 10_000);
    return () => {
      alive = false;
      clearInterval(itv);
    };
  }, [fetchOperation]);

  // ── Derived UI helpers ────────────────────────────────────────
  const statusText = useMemo(
    () => ((t(status) as string)?.toUpperCase?.() || status.toUpperCase()),
    [status, t]
  );

  const opLabel = useMemo((): string => {
    switch (op) {
      case "inservice_entry":   return (t("op_inservice_entry") as string) || "Inservice – Entry";
      case "inservice_exit":    return (t("op_inservice_exit") as string) || "Inservice – Exit";
      case "inservice_bidirect":return (t("op_inservice_bi") as string)   || "Inservice – Bi-direction";
      case "out_of_service":    return (t("op_out_of_service") as string) || "Out of service";
      case "station_close":     return (t("op_station_close") as string)  || "Station close";
      case "emergency":         return (t("op_emergency") as string)      || "Emergency";
      default:                  return (t("operation") as string)          || "Operation";
    }
  }, [op, t]);

  const opPillClass = useMemo(() => {
    if (!op) return "bg-gray-100 text-gray-700 border-gray-200";
    if (op.startsWith("inservice_"))
      return "bg-green-100 text-green-800 border-green-200";
    if (op === "out_of_service" || op === "station_close")
      return "bg-red-100 text-red-800 border-red-200";
    if (op === "emergency")
      // soft glow + gentle scale (defined in global CSS as .emergency-anim)
      return "text-amber-900 border-amber-300 emergency-anim ring-2 ring-amber-400/50";
    return "bg-gray-100 text-gray-700 border-gray-200";
  }, [op]);

  const probeTip = useMemo(() => {
    if (probe && "reachable" in probe)
      return `rtt: ${probe.rttMs}ms, reachable: ${probe.reachable}`;
    return "";
  }, [probe]);

  const cardTitle = useMemo(
    () =>
      [device.name, op ? `• ${opLabel}` : "", `• ${statusText}`]
        .filter(Boolean)
        .join(" "),
    [device.name, op, opLabel, statusText]
  );

  // ── Small UI atoms ────────────────────────────────────────────
  const StatusBadge = (
    <span
      className={`inline-flex items-center text-xs border px-2 py-0.5 rounded-full ${statusClass(
        status
      )}`}
      title={[
        `effective: ${status}`,
        hb?.agoText ? `last seen: ${hb.agoText}` : "",
        probeTip,
      ]
        .filter(Boolean)
        .join(" · ")}
    >
      {statusText}
    </span>
  );

  const OperationPill = (
    <span
      className={`inline-flex items-center text-[11px] border px-2 py-0.5 rounded-full ${opPillClass}`}
      title={op ?? "—"}
      aria-busy={opLoading || undefined}
      aria-live="polite"
    >
      {opLoading ? (t("loading") as string) || "Loading..." : op ? opLabel : "—"}
    </span>
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={() => onClick?.(device)}
      className="text-left rounded-2xl border p-4 bg-white hover:shadow transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={cardTitle}
      title={cardTitle}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium">{device.name}</div>
        <div className="flex items-center gap-2">
          {OperationPill}
          {StatusBadge}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
        <div className={labelCls}>{t("device_id")}</div>
        <div className="text-gray-900">{device.id}</div>

        <div className={labelCls}>{t("device_gate")}</div>
        <div className="text-gray-900">{device.gateId ?? "-"}</div>

        <div className={labelCls}>{t("device_side")}</div>
        <div className="text-gray-900">{sideLabel(lang, device.side)}</div>

        <div className={labelCls}>{t("device_type")}</div>
        <div className="text-gray-900">{device.type ?? "-"}</div>

        <div className={labelCls}>{t("device_ip")}</div>
        <div className="text-gray-900">
          {device.deviceIp ?? "-"}
          {probe && "reachable" in probe && (
            <span className="ml-2 text-xs text-gray-500">
              • {probe.reachable ? `${probe.rttMs}ms` : "unreachable"} (:{probePort})
            </span>
          )}
        </div>

        <div className={labelCls}>{t("device_heartbeat")}</div>
        <div className="text-gray-900">{hb?.agoText ?? device.lastHeartbeat ?? "-"}</div>

        <div className={labelCls}>{t("operation")}</div>
        <div>{OperationPill}</div>

        {device.message && (
          <>
            <div className={labelCls}>{t("device_message")}</div>
            <div className="text-gray-900">{device.message}</div>
          </>
        )}
      </div>
    </button>
  );
}
