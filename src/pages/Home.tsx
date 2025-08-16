// src/pages/Home.tsx
import type { Device, Side } from "@/models/device";
import { useEffect, useMemo, useState } from "react";
import useEffectiveStatus, { useEffectiveSummary } from "@/hooks/useEffectiveStatus";

import DeviceCard from "@/components/DeviceCard";
import DeviceControlModal from "@/components/DeviceControlModal";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { STATUS_ORDER } from "@/utils/status";
import SummaryCard from "@/components/SummaryCard";
import { sideLabel } from "@/utils/side";
import { useI18n } from "@/i18n/I18nProvider";

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [active, setActive] = useState<Side>("north");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Device | null>(null);
  const [probePort, setProbePort] = useState<number>(22);  // ← พอร์ต probe จาก config
  const { t, lang } = useI18n();

  // โหลด config เพื่อเอาพอร์ต probe
  useEffect(() => {
    (async () => {
      try {
        const res = await window.api?.getConfig();
        const portFromCfg = Number(res?.config?.deviceProbePort);
        if (portFromCfg > 0) setProbePort(portFromCfg);
      } catch {}
    })();
  }, []);

  // load + subscribe อุปกรณ์
  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await window.devices?.getDevices();
        if (!disposed && res?.ok) {
          setDevices(res.devices as Device[]);
          window.logger?.info?.("[home] loaded devices", {
            count: res.devices.length,
            path: res.path,
          });
        }
      } catch (e) {
        window.logger?.error?.("[home] load devices error", String(e));
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    load();

    const off = window.devices?.onUpdated?.((list) => {
      setDevices(list as Device[]);
      window.logger?.info?.("[home] devices updated", { count: (list as Device[]).length });
    });

    return () => { disposed = true; off && off(); };
  }, []);

  // ใช้ effective summary (ให้ probePort จาก config)
  const { counts: eff } = useEffectiveSummary(devices, {
    label: "home",
    refreshMs: 6000,
    tcpPort: probePort,         // ← ตรงกับ DeviceCard/Modal แล้ว
    timeoutMs: 1200,
    staleMs: 60_000,
    offlineMs: 300_000,
  });

  // รวม stale เข้ากับ offline บนการ์ดสรุป
  const summaryCounts = {
    total: devices.length,
    online: eff.online,
    maintenance: eff.maintenance,
    fault: eff.fault,
    offline: eff.offline + eff.stale,
  };

  // แยกฝั่ง + sort (ตาม status ดิบหรือจะเปลี่ยนเป็น effective ก็ได้)
  const { north, south } = useMemo(() => {
    const byStatus = (a: Device, b: Device) =>
      STATUS_ORDER[a.status ?? "offline"] - STATUS_ORDER[b.status ?? "offline"] ||
      (a.name || a.id).localeCompare(b.name || b.id);

    return {
      north: devices.filter((d) => d.side === "north").sort(byStatus),
      south: devices.filter((d) => d.side === "south").sort(byStatus),
    };
  }, [devices]);

  const list = active === "north" ? north : south;

  return (
    <div className="bg-white min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Summary cards */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SummaryCard label={t("total")} value={summaryCounts.total} />
          <SummaryCard label={t("online")} value={summaryCounts.online} tone="online" />
          <SummaryCard label={t("maintenance")} value={summaryCounts.maintenance} tone="maintenance" />
          <SummaryCard label={t("fault")} value={summaryCounts.fault} tone="fault" />
          <SummaryCard label={t("offline")} value={summaryCounts.offline} tone="offline" />
        </section>

        {/* Tabs North/South */}
        <section className="flex gap-2">
          <button
            onClick={() => setActive("north")}
            className={`px-4 py-2 rounded-xl border ${active === "north" ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"}`}
          >
            {sideLabel(lang, "north")} ({north.length})
          </button>
          <button
            onClick={() => setActive("south")}
            className={`px-4 py-2 rounded-xl border ${active === "south" ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"}`}
          >
            {sideLabel(lang, "south")} ({south.length})
          </button>
        </section>

        {/* Device list */}
        <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading && <div className="text-sm text-gray-500">{t("loading_devices")}</div>}
          {!loading && list.length === 0 && <div className="text-sm text-gray-500">{t("no_devices")}</div>}
          {!loading && list.map((d) => (
            <DeviceCard key={d.id} device={d} onClick={() => setSelected(d)} />
          ))}
        </section>
      </main>

      <Footer />

      <DeviceControlModal
        open={!!selected}
        device={selected}
        onClose={() => setSelected(null)}
        onEnter={(dev, op) => {
          window.logger?.info?.("[device] submit command", { id: dev.id, op });
        }}
      />
    </div>
  );
}
