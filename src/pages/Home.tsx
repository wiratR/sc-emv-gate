// src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";

type DeviceStatus = "online" | "offline" | "fault" | "maintenance";
type Side = "north" | "south";
type Device = {
  id: string;
  gateId?: string;
  name: string;
  side: Side;
  type?: string;
  status: DeviceStatus;
  lastHeartbeat?: string;
  message?: string;
};

const STATUS_ORDER: Record<DeviceStatus, number> = {
  online: 1,
  maintenance: 2,
  fault: 3,
  offline: 4,
};

const statusClass = (s: DeviceStatus) =>
  ({
    online: "bg-green-100 text-green-800 border-green-200",
    offline: "bg-gray-100 text-gray-800 border-gray-200",
    fault: "bg-red-100 text-red-800 border-red-200",
    maintenance: "bg-amber-100 text-amber-900 border-amber-200",
  }[s]);

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [active, setActive] = useState<Side>("north");
  const [srcPath, setSrcPath] = useState<string>("");

  // โหลดครั้งแรก + subscribe updates
  useEffect(() => {
    (async () => {
      const res = await window.devices?.getDevices();
      if (res?.ok) {
        setDevices(res.devices as Device[]);
        setSrcPath(res.path);
        window.logger?.info("[home] loaded devices", { count: res.devices.length, path: res.path });
      } else {
        window.logger?.warn("[home] failed to load devices");
      }
    })();

    const dispose = window.devices?.onUpdated?.((list) => {
      setDevices(list as Device[]);
      window.logger?.info("[home] devices updated", { count: list.length });
    });

    return () => dispose && dispose();
  }, []);

  const { north, south, counts } = useMemo(() => {
    const n = devices.filter((d) => d.side === "north").sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    const s = devices.filter((d) => d.side === "south").sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

    const c = {
      total: devices.length,
      online: devices.filter((d) => d.status === "online").length,
      offline: devices.filter((d) => d.status === "offline").length,
      fault: devices.filter((d) => d.status === "fault").length,
      maintenance: devices.filter((d) => d.status === "maintenance").length,
    };
    return { north: n, south: s, counts: c };
  }, [devices]);

  const list = active === "north" ? north : south;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Device Monitoring – Station Gate</h1>
        <div className="text-xs text-gray-500">
          Source: <code>{srcPath || "device-communication.json"}</code>
        </div>
      </header>

      {/* Summary */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Total" value={counts.total} />
        <SummaryCard label="Online" value={counts.online} tone="online" />
        <SummaryCard label="Maintenance" value={counts.maintenance} tone="maintenance" />
        <SummaryCard label="Fault" value={counts.fault} tone="fault" />
        <SummaryCard label="Offline" value={counts.offline} tone="offline" />
      </section>

      {/* Tabs North/South */}
      <section className="flex gap-2">
        <button
          onClick={() => setActive("north")}
          className={`px-4 py-2 rounded-xl border ${active === "north" ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"}`}
        >
          North ({north.length})
        </button>
        <button
          onClick={() => setActive("south")}
          className={`px-4 py-2 rounded-xl border ${active === "south" ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"}`}
        >
          South ({south.length})
        </button>
      </section>

      {/* List */}
      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map((d) => (
          <DeviceCard key={d.id} device={d} />
        ))}
        {list.length === 0 && (
          <div className="text-sm text-gray-500">No devices on this side.</div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: DeviceStatus }) {
  const toneClass =
    tone === "online"
      ? "bg-green-50 text-green-800 border-green-200"
      : tone === "maintenance"
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : tone === "fault"
      ? "bg-red-50 text-red-800 border-red-200"
      : tone === "offline"
      ? "bg-gray-50 text-gray-800 border-gray-200"
      : "bg-white text-gray-900";
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function DeviceCard({ device }: { device: Device }) {
  const badge = (
    <span className={`inline-flex items-center text-xs border px-2 py-0.5 rounded-full ${statusClass(device.status)}`}>
      {device.status.toUpperCase()}
    </span>
  );

  return (
    <div className="rounded-2xl border p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="font-medium">{device.name}</div>
        {badge}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm text-gray-600">
        <div>ID</div><div className="text-gray-900">{device.id}</div>
        <div>Gate</div><div className="text-gray-900">{device.gateId ?? "-"}</div>
        <div>Side</div><div className="text-gray-900 capitalize">{device.side}</div>
        <div>Type</div><div className="text-gray-900">{device.type ?? "-"}</div>
        <div>Heartbeat</div><div className="text-gray-900">{device.lastHeartbeat ?? "-"}</div>
        <div>Message</div><div className="text-gray-900">{device.message ?? "-"}</div>
      </div>
    </div>
  );
}
