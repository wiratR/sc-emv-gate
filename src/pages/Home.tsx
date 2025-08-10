// src/pages/Home.tsx

import { useEffect, useMemo, useState } from "react";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/auth/AuthContext";

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

// ✅ ลำดับการเรียง status (online มาก่อน, offline ไปท้ายสุด)
const STATUS_ORDER: Record<DeviceStatus, number> = {
  online: 1,
  maintenance: 2,
  fault: 3,
  offline: 4,
};

// ✅ กำหนดสีพื้นหลัง + ข้อความตาม status (ใช้กับการ์ดและ badge)
const statusClass = (s: DeviceStatus) =>
  ({
    online: "bg-green-100 text-green-800 border-green-200",
    offline: "bg-gray-100 text-gray-800 border-gray-200",
    fault: "bg-red-100 text-red-800 border-red-200",
    maintenance: "bg-amber-100 text-amber-900 border-amber-200",
  }[s]);

export default function Home() {
  // --- Auth: ใช้ดึง username ไปโชว์บน header ---
  const { user } = useAuth();

  // --- State อุปกรณ์/สถานี ---
  const [devices, setDevices] = useState<Device[]>([]);
  const [active, setActive] = useState<Side>("north");
  const [stationName, setStationName] = useState<string>("");
  const [stationId, setStationId] = useState<string>("");
  const [stationIp, setStationIp] = useState<string>("");

  // ✅ โหลด devices + config ครั้งแรก และ subscribe อัปเดตจาก main
  useEffect(() => {
    (async () => {
      // โหลดรายการอุปกรณ์
      const res = await window.devices?.getDevices();
      if (res?.ok) {
        setDevices(res.devices as Device[]);
        window.logger?.info("[home] loaded devices", { count: res.devices.length });
      } else {
        window.logger?.warn("[home] failed to load devices");
      }

      // โหลดข้อมูลสถานีจาก config
      const cfg = await window.api?.getConfig?.();
      if (cfg?.ok) {
        const c = cfg.config || {};
        setStationName(String(c.stationName ?? ""));
        setStationId(String(c.stationId ?? ""));
        setStationIp(String(c.stationIp ?? ""));
        window.logger?.info("[home] station info", {
          stationName: c.stationName,
          stationId: c.stationId,
          stationIp: c.stationIp,
        });
      }
    })();

    // subscribe เมื่อไฟล์ devices ถูกปรับปรุง
    const dispose = window.devices?.onUpdated?.((list) => {
      setDevices(list as Device[]);
      window.logger?.info("[home] devices updated", { count: list.length });
    });

    return () => dispose && dispose();
  }, []);

  // ✅ สร้างชุดข้อมูลแยกฝั่ง + นับจำนวนตามสถานะ
  const { north, south, counts } = useMemo(() => {
    const n = devices
      .filter((d) => d.side === "north")
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    const s = devices
      .filter((d) => d.side === "south")
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

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
    // ✅ หน้าโทนขาว
    <div className="bg-white min-h-screen">
      {/* ───────────────────────── Header ───────────────────────── */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* ซ้าย: โลโก้/ชื่อระบบ */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600" />
              <div>
                <div className="text-base font-semibold leading-none">
                  EMV Gate Monitoring
                </div>
                <div className="text-xs text-gray-500 leading-none mt-1">
                  North / South device health
                </div>
              </div>
            </div>

            {/* กลาง: ข้อมูลสถานี (ตัวหนา) */}
            <div className="text-center">
              <div className="font-semibold">
                {stationName || "-"} {stationId ? `(ID: ${stationId})` : ""}
              </div>
              <div className="font-semibold">{stationIp || "-"}</div>
            </div>

            {/* ขวา: Username + LanguageSwitcher */}
            <div className="flex items-center gap-3">
              <div className="text-sm text-right">
                <div className="font-semibold leading-none">
                  {user?.username || "Guest"}
                </div>
                <div className="text-xs text-gray-500 leading-none mt-1">
                  {user?.role?.toUpperCase?.() || ""}
                </div>
              </div>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────── Body ───────────────────────── */}
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Summary Cards */}
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
            className={`px-4 py-2 rounded-xl border ${
              active === "north" ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"
            }`}
          >
            North ({north.length})
          </button>
          <button
            onClick={() => setActive("south")}
            className={`px-4 py-2 rounded-xl border ${
              active === "south" ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"
            }`}
          >
            South ({south.length})
          </button>
        </section>

        {/* Device List */}
        <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((d) => (
            <DeviceCard key={d.id} device={d} />
          ))}
          {list.length === 0 && (
            <div className="text-sm text-gray-500">No devices on this side.</div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ───────────────────── Components ───────────────────── */

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: DeviceStatus;
}) {
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
    <span
      className={`inline-flex items-center text-xs border px-2 py-0.5 rounded-full ${statusClass(
        device.status
      )}`}
    >
      {device.status.toUpperCase()}
    </span>
  );

  return (
    <div className={`rounded-2xl border p-4 ${statusClass(device.status)}`}>
      <div className="flex items-center justify-between">
        <div className="font-medium">{device.name}</div>
        {badge}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
        <div>ID</div>
        <div>{device.id}</div>
        <div>Gate</div>
        <div>{device.gateId ?? "-"}</div>
        <div>Side</div>
        <div className="capitalize">{device.side}</div>
        <div>Type</div>
        <div>{device.type ?? "-"}</div>
        <div>Heartbeat</div>
        <div>{device.lastHeartbeat ?? "-"}</div>
        <div>Message</div>
        <div>{device.message ?? "-"}</div>
      </div>
    </div>
  );
}
