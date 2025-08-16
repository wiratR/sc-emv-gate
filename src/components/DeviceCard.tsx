// src/components/DeviceCard.tsx

import { Device } from "@/models/device";
import { sideLabel } from "@/utils/side";
import { statusClass } from "@/utils/status";
import useEffectiveStatus from "@/hooks/useEffectiveStatus";
import { useI18n } from "@/i18n/I18nProvider";
import useProbePort from "@/hooks/useProbePort";

export default function DeviceCard({
  device,
  onClick,
}: {
  device: Device;
  onClick?: (d: Device) => void;
}) {
  const { t, lang } = useI18n();
  const labelCls = "font-bold text-gray-700";
  const probePort = useProbePort(22); // default 22; จะ override ด้วย config

  // ใช้ effective status (probe + heartbeat)
  const { status, hb, probe } = useEffectiveStatus(device, {
    label: `card:${device.id}:${device.gateId ?? device.name}`,
    refreshMs: 8000,
    tcpPort: probePort,
    timeoutMs: 1200,
    staleMs: 60_000,
    offlineMs: 300_000,
  });

  const statusText =
    (t(status) as string)?.toUpperCase?.() || status.toUpperCase();

  const badge = (
    <span
      className={`inline-flex items-center text-xs border px-2 py-0.5 rounded-full ${statusClass(status)}`}
      title={[
        `effective: ${status}`,
        hb?.agoText ? `last seen: ${hb.agoText}` : "",
        probe && "reachable" in probe
          ? `rtt: ${probe.rttMs}ms, reachable: ${probe.reachable}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ")}
    >
      {statusText}
    </span>
  );

  return (
    <button
      type="button"
      onClick={() => onClick?.(device)}
      className="text-left rounded-2xl border p-4 bg-white hover:shadow transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`${device.name} – ${statusText}`}
      title={`${device.name} – ${statusText}`}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium">{device.name}</div>
        {badge}
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
          {probe?.ok && (
            <span className="ml-2 text-xs text-gray-500">
              • {probe.reachable ? `${probe.rttMs}ms` : "unreachable"} (:{probePort})
            </span>
          )}
        </div>
        <div className={labelCls}>{t("device_heartbeat")}</div>
        <div className="text-gray-900">
          {hb?.agoText ?? device.lastHeartbeat ?? "-"}
        </div>

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
