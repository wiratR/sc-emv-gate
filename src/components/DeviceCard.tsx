// src/components/DeviceCard.tsx

import { Device } from "@/models/device";
import { statusClass } from "@/utils/status";

type Side = "north" | "south";

export default function DeviceCard({ device }: { device: Device }) {
  const badge = (
    <span className={`inline-flex items-center text-xs border px-2 py-0.5 rounded-full ${statusClass(device.status)}`}>
      {device.status.toUpperCase()}
    </span>
  );

  return (
    <div className="rounded-2xl border p-4 bg-white">
      {/* ชื่ออุปกรณ์ + Badge สถานะ */}
      <div className="flex items-center justify-between">
        <div className="font-medium">{device.name}</div>
        {badge}
      </div>

      {/* รายละเอียดอุปกรณ์ */}
      <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm text-gray-600">
        <div>ID</div><div className="text-gray-900">{device.id}</div>
        <div>Gate</div><div className="text-gray-900">{device.gateId ?? "-"}</div>
        <div>Side</div><div className="text-gray-900 capitalize">{device.side}</div>
        <div>Type</div><div className="text-gray-900">{device.type ?? "-"}</div>
        <div>IP</div><div className="text-gray-900">{device.deviceIp ?? "-"}</div>
        <div>Heartbeat</div><div className="text-gray-900">{device.lastHeartbeat ?? "-"}</div>
        <div>Message</div><div className="text-gray-900">{device.message ?? "-"}</div>
      </div>
    </div>
  );
}
