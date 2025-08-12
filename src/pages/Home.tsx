// src/pages/Home.tsx

import { Device, Side } from "@/models/device";
import { useEffect, useMemo, useState } from "react";

import DeviceCard from "@/components/DeviceCard";
import DeviceControlModal from "@/components/DeviceControlModal";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { STATUS_ORDER } from "@/utils/status";
import SummaryCard from "@/components/SummaryCard";
import { sideLabel } from "@/utils/side";
import { useI18n } from "@/i18n/I18nProvider";

export default function Home() {
  // ── State ───────────────────────────────────────────────────
  const [devices, setDevices] = useState<Device[]>([]);
  const [active, setActive] = useState<Side>("north");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Device | null>(null);
  const { t, lang } = useI18n();

  // ── Effects: load + subscribe updates ───────────────────────
  useEffect(() => {
    let disposed = false;

    (async () => {
      try {
        const res = await window.devices?.getDevices();
        if (!disposed && res?.ok) {
          setDevices(res.devices as Device[]);
          window.logger?.info?.("[home] loaded devices", {
            count: res.devices.length,
            path: res.path,
          });
        }
      } catch (e) {
        window.logger?.error?.("[home] load devices error", e);
      } finally {
        if (!disposed) setLoading(false);
      }
    })();

    const unsubscribe = window.devices?.onUpdated?.((list) => {
      setDevices(list as Device[]);
      window.logger?.info?.("[home] devices updated", { count: list.length });
    });

    return () => {
      disposed = true;
      unsubscribe && unsubscribe();
    };
  }, []);

  // ── Derived: split/sort + counts ────────────────────────────
  const { north, south, counts } = useMemo(() => {
    const byStatus = (a: Device, b: Device) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status];

    const n = devices.filter((d) => d.side === "north").sort(byStatus);
    const s = devices.filter((d) => d.side === "south").sort(byStatus);

    const c = {
      total: devices.length,
      online: devices.filter((d) => d.status === "online").length,
      maintenance: devices.filter((d) => d.status === "maintenance").length,
      fault: devices.filter((d) => d.status === "fault").length,
      offline: devices.filter((d) => d.status === "offline").length,
    };
    return { north: n, south: s, counts: c };
  }, [devices]);

  const list = active === "north" ? north : south;

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="bg-white min-h-screen">
      {/* Header กลาง (อ่าน station/user/ภาษา ภายในเอง) */}
      <Header />

      {/* Body */}
      <main className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Summary cards */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SummaryCard label={t("total")} value={counts.total} />
          <SummaryCard label={t("online")} value={counts.online} tone="online" />
          <SummaryCard label={t("maintenance")} value={counts.maintenance} tone="maintenance" />
          <SummaryCard label={t("fault")} value={counts.fault} tone="fault" />
          <SummaryCard label={t("offline")} value={counts.offline} tone="offline" />
        </section>

        {/* Tabs North/South */}
        <section className="flex gap-2">
          <button
            onClick={() => setActive("north")}
            className={`px-4 py-2 rounded-xl border ${
              active === "north" 
                ? "bg-blue-600 text-white border-blue-600" 
                : "hover:bg-gray-50"}`}
          >
            {sideLabel(lang, "north")} ({north.length})
          </button>
          <button
            onClick={() => setActive("south")}
            className={`px-4 py-2 rounded-xl border ${
              active === "south"
                ? "bg-blue-600 text-white border-blue-600"
                : "hover:bg-gray-50"
            }`}
          >
            {sideLabel(lang, "south")} ({south.length})
          </button>
        </section>

        {/* Device list */}
        <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading && (
            <div className="text-sm text-gray-500">Loading devices…</div>
          )}
          {!loading && list.length === 0 && (
            <div className="text-sm text-gray-500">
              No devices on this side.
            </div>
          )}
          {!loading &&
            list.map((d) => (
              <DeviceCard key={d.id} device={d} onClick={() => setSelected(d)} />
            ))}
        </section>
      </main>

      <Footer />

      {/* Popup: Gate Operation Control */}
      <DeviceControlModal
        open={!!selected}
        device={selected}
        onClose={() => setSelected(null)}
        onEnter={(dev, op) => {
          // hook ไว้ต่อ IPC จริง
          window.logger?.info?.("[device] submit command", { id: dev.id, op });
          // await window.devices?.sendGateCommand?.({ deviceId: dev.id, command: op });
        }}
      />
    </div>
  );
}
