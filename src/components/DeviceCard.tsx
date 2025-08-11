// src/components/DeviceCard.tsx

import { Device } from "@/models/device";
import { sideLabel } from "@/utils/side";
import { statusClass } from "@/utils/status";
import { useI18n } from "@/i18n/I18nProvider";

export default function DeviceCard({ device, onClick }: { device: Device; onClick?: (d: Device) => void }) {

  const { lang } = useI18n();

  const badge = (
    <span className={`inline-flex items-center text-xs border px-2 py-0.5 rounded-full ${statusClass(device.status)}`}>
      {device.status.toUpperCase()}
    </span>
  );

  return (
    <button
      type="button"
      onClick={() => onClick?.(device)}
      className="text-left rounded-2xl border p-4 bg-white hover:shadow transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-center justify-between">
        <div className="font-medium">{device.name}</div>
        {badge}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm text-gray-600">
        <div>ID</div>
        <div className="text-gray-900">{device.id}</div>
        <div>Gate</div>
        <div className="text-gray-900">{device.gateId ?? "-"}</div>
        <div>Side</div>
        <div className="text-gray-900">{sideLabel(lang, device.side)}</div>
        <div>Type</div>
        <div className="text-gray-900">{device.type ?? "-"}</div>
        <div>IP</div>
        <div className="text-gray-900">{(device as any).deviceIp ?? "-"}</div>
        <div>Heartbeat</div>
        <div className="text-gray-900">{device.lastHeartbeat ?? "-"}</div>
      </div>
    </button>
  );
}
