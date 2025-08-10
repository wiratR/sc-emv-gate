// src/pages/Home.tsx

import { Device, Side } from "@/models/device";
import { useEffect, useMemo, useState } from "react";

import DeviceCard from "@/components/DeviceCard";
import Header from "@/components/Header";
import { STATUS_ORDER } from "@/utils/status";
import SummaryCard from "@/components/SummaryCard";
import { useAuth } from "@/auth/AuthContext";

export default function Home() {
  const { user, logout } = useAuth();

  const [devices, setDevices] = useState<Device[]>([]);
  const [active, setActive] = useState<Side>("north");
  const [stationName, setStationName] = useState<string>("");
  const [stationId, setStationId] = useState<string>("");
  const [stationIp, setStationIp] = useState<string>("");

  useEffect(() => {
    (async () => {
      const res = await window.devices?.getDevices();
      if (res?.ok) setDevices(res.devices as Device[]);

      const cfg = await window.api?.getConfig?.();
      if (cfg?.ok) {
        setStationName(cfg.config.stationName ?? "");
        setStationId(cfg.config.stationId ?? "");
        setStationIp(cfg.config.stationIp ?? "");
      }
    })();

    const dispose = window.devices?.onUpdated?.((list) => {
      setDevices(list as Device[]);
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
    <div className="bg-white min-h-screen">
      {/* Header */}
      <Header />  
      {/* 
        ถ้าหน้าไหนไม่อยากโชว์ station info (เช่นหน้า Login): 
        <Header showStationInfo={false} />
      */}

      {/* Body */}
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Summary */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SummaryCard label="Total" value={counts.total} />
          <SummaryCard label="Online" value={counts.online} tone="online" />
          <SummaryCard label="Maintenance" value={counts.maintenance} tone="maintenance" />
          <SummaryCard label="Fault" value={counts.fault} tone="fault" />
          <SummaryCard label="Offline" value={counts.offline} tone="offline" />
        </section>

        {/* Tabs */}
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
