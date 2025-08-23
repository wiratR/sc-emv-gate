// src/components/LogSettings.tsx

import { useEffect, useMemo, useState } from "react";

import StatusModal from "@/components/StatusModal";
import { useI18n } from "@/i18n/I18nProvider";

const LEVELS = ["debug", "info", "warn", "error"] as const;
type Level = (typeof LEVELS)[number];

type Variant = "info" | "success" | "error" | "confirm";
type ModalState = {
  open: boolean;
  variant: Variant;
  title: string;
  message: string;
  onConfirm?: () => void | Promise<void>;
};

type DeviceRow = {
  id: string;
  ip: string;
  name?: string;
  gateId?: string;
  side?: "north" | "south" | "";
  type?: string;
};

function clampPort(n: number) {
  if (!Number.isFinite(n)) return NaN;
  if (n < 1 || n > 65535) return NaN;
  return Math.floor(n);
}

function isStationNameObj(v: unknown): v is { th?: string; en?: string } {
  return !!v && typeof v === "object";
}

export default function LogSettings() {
  const { t } = useI18n();

  // ── Tabs ─────────────────────────────────────────────────────
  type Tab = "general" | "devices";
  const [tab, setTab] = useState<Tab>("general");

  // ── Log ─────────────────────────────────────────────────────
  const [level, setLevel] = useState<Level>("info");
  const [logDir, setLogDir] = useState("");
  const [logFile, setLogFile] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Station / Display / Ports ───────────────────────────────
  const [stationNameTh, setStationNameTh] = useState("");
  const [stationNameEn, setStationNameEn] = useState("");
  const [stationId, setStationId] = useState("");
  const [stationIp, setStationIp] = useState("");
  const [fullScreen, setFullScreen] = useState<boolean>(false);
  const [heartbeatPort, setHeartbeatPort] = useState<number | "">("");
  const [deviceProbePort, setDeviceProbePort] = useState<number | "">("");

  // ── Devices (editable list) ─────────────────────────────────
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [devFilter, setDevFilter] = useState("");

  // ── Modal ───────────────────────────────────────────────────
  const [m, setM] = useState<ModalState>({
    open: false,
    variant: "info",
    title: "",
    message: "",
  });

  useEffect(() => {
    (async () => {
      const cfg = await window.api?.getConfig();
      const info = await window.api?.getLogInfo();

      if (cfg?.ok) {
        setLevel((cfg.config.logLevel || "info") as Level);

        // stationName: รองรับ string หรือ {th,en}
        const raw = cfg.config.stationName as unknown;
        if (typeof raw === "string") {
          setStationNameTh(raw);
          setStationNameEn(raw);
        } else if (isStationNameObj(raw)) {
          const obj = raw as { th?: string; en?: string };
          setStationNameTh(typeof obj.th === "string" ? obj.th : "");
          setStationNameEn(typeof obj.en === "string" ? obj.en : "");
        } else {
          setStationNameTh("");
          setStationNameEn("");
        }

        setStationId(cfg.config.stationId ?? "");
        setStationIp(cfg.config.stationIp ?? "");
        setFullScreen(!!cfg.config.fullScreen);

        setHeartbeatPort(
          Number.isFinite(Number(cfg.config.heartbeatPort))
            ? Number(cfg.config.heartbeatPort)
            : 3070
        );
        setDeviceProbePort(
          Number.isFinite(Number(cfg.config.deviceProbePort))
            ? Number(cfg.config.deviceProbePort)
            : 22
        );

        // devices[] จาก config (optional)
        const list = Array.isArray((cfg.config as any).devices)
          ? ((cfg.config as any).devices as any[])
          : [];
        const rows: DeviceRow[] = list.map((d) => ({
          id: String(d.id ?? ""),
          ip: String(d.ip ?? d.deviceIp ?? ""),
          name: d.name ? String(d.name) : "",
          gateId: d.gateId ? String(d.gateId) : "",
          side: (d.side === "north" || d.side === "south") ? d.side : "",
          type: d.type ? String(d.type) : "",
        }));
        setDevices(rows);
      }

      if (info?.ok) {
        setLogDir(info.logDir);
        setLogFile(info.logFile);
      }
    })();
  }, []);

  // ── Validators ───────────────────────────────────────────────
  const deviceErrors = useMemo(() => {
    const errs: Record<number, string[]> = {};
    const ids = new Map<string, number[]>();
    devices.forEach((d, i) => {
      if (!d.id.trim()) (errs[i] ??= []).push("id required");
      if (!d.ip.trim()) (errs[i] ??= []).push("ip required");
      const k = d.id.trim();
      if (k) ids.set(k, [...(ids.get(k) || []), i]);
    });
    ids.forEach((idxs) => {
      if (idxs.length > 1) {
        idxs.forEach((i) => (errs[i] ??= []).push("duplicate id"));
      }
    });
    return errs;
  }, [devices]);

  const hasDeviceError = Object.keys(deviceErrors).length > 0;

  // ── Actions: devices table ───────────────────────────────────
  const addDevice = () =>
    setDevices((x) => [
      ...x,
      { id: "", ip: "", name: "", gateId: "", side: "", type: "" },
    ]);

  const removeDevice = (idx: number) =>
    setDevices((x) => x.filter((_, i) => i !== idx));

  const updateDevice =
    (idx: number, key: keyof DeviceRow) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.value;
      setDevices((x) =>
        x.map((row, i) =>
          i === idx
            ? {
                ...row,
                [key]:
                  key === "side"
                    ? (v === "north" || v === "south" ? v : "")
                    : v,
              }
            : row
        )
      );
    };

  // ── Save all ─────────────────────────────────────────────────
  const doSave = async () => {
    // validate ports
    const hb = clampPort(Number(heartbeatPort));
    const dp = clampPort(Number(deviceProbePort));
    if (!Number.isFinite(hb) || !Number.isFinite(dp)) {
      setM({
        open: true,
        variant: "error",
        title: t("error") as string,
        message:
          (t("invalid_port") as string) ||
          "Invalid port(s). Ports must be 1–65535.",
      });
      return;
    }

    // validate devices
    if (hasDeviceError) {
      setM({
        open: true,
        variant: "error",
        title: t("error") as string,
        message:
          (t("fix_device_rows") as string) ||
          "Please fix device rows (id/ip required; id must be unique).",
      });
      setTab("devices");
      return;
    }

    setSaving(true);
    try {
      // sanitize devices -> เฉพาะฟิลด์ที่คอนฟิกได้
      const devOut = devices
        .map((d) => ({
          id: d.id.trim(),
          ip: d.ip.trim(),
          ...(d.name ? { name: d.name.trim() } : {}),
          ...(d.gateId ? { gateId: d.gateId.trim() } : {}),
          ...(d.side ? { side: d.side } : {}),
          ...(d.type ? { type: d.type.trim() } : {}),
        }))
        .filter((d) => d.id && d.ip);

      const payload = {
        logLevel: level,
        stationName: { th: stationNameTh || "", en: stationNameEn || "" },
        stationId: stationId || "",
        stationIp: stationIp || "",
        fullScreen: !!fullScreen,
        heartbeatPort: hb,
        deviceProbePort: dp,
        devices: devOut,
      };

      const res = await window.api?.updateConfig(payload);
      if (!res?.ok) {
        setM({
          open: true,
          variant: "error",
          title: t("error") as string,
          message: res?.error || ((t("save") as string) + " failed"),
        });
        return;
      }
      setM({
        open: true,
        variant: "success",
        title: t("success") as string,
        message:
          (t("save") as string) +
          " OK. " +
          (t("will_apply_next_launch") as string),
      });
    } finally {
      setSaving(false);
    }
  };

  const askConfirmSave = () => {
    const fsText = fullScreen ? "ON" : "OFF";
    setM({
      open: true,
      variant: "confirm",
      title: t("confirm") as string,
      message:
        `${t("save")} ? ` +
        `(${t("fullscreen")} = ${fsText}, ` +
        `HB:${heartbeatPort || "-"}, Probe:${deviceProbePort || "-"}) ` +
        `${t("will_apply_next_launch")}.`,
      onConfirm: async () => {
        setM((x) => ({ ...x, open: false }));
        await doSave();
      },
    });
  };

  const openFolder = async () => {
    const res = await window.api?.openLogsFolder();
    if (!res?.ok) alert("Cannot open logs folder");
  };

  // filter view (เฉพาะหน้า Devices)
  const visibleDevices = useMemo(() => {
    const q = devFilter.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) =>
      [d.id, d.ip, d.name, d.gateId, d.side, d.type]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [devices, devFilter]);

  return (
    <section className="p-4 bg-white rounded-2xl border shadow-sm">
      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          className={`px-3 py-1.5 rounded-lg border ${tab === "general" ? "bg-blue-50 border-blue-300 text-blue-700" : "hover:bg-gray-50"}`}
          onClick={() => setTab("general")}
        >
          {t("settings") || "Settings"}
        </button>
        <button
          className={`px-3 py-1.5 rounded-lg border ${tab === "devices" ? "bg-blue-50 border-blue-300 text-blue-700" : "hover:bg-gray-50"}`}
          onClick={() => setTab("devices")}
        >
          {t("devices") || "Devices"}
        </button>
      </div>

      {tab === "general" && (
        <>
          {/* ── Log settings ───────────────────────────────────── */}
          <fieldset className="rounded-xl border p-3">
            <legend className="px-2 text-sm font-semibold">{t("log_level")}</legend>
            <div className="mt-2 flex items-center justify-between gap-4">
              <label className="text-sm">{t("log_level")}</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as Level)}
                className="border rounded-lg px-3 py-2"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <div>
                {t("log_dir")}: <code>{logDir}</code>
              </div>
              <div>
                {t("log_file")}: <code>{logFile}</code>
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={openFolder}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                {t("open_logs_folder")}
              </button>
            </div>
          </fieldset>

          {/* ── Station & Display ─────────────────────────────── */}
          <fieldset className="mt-4 rounded-xl border p-3">
            <legend className="px-2 text-sm font-semibold">
              {t("station_name")} / {t("station_id")} / {t("station_ip")} &nbsp;·&nbsp; {t("fullscreen")}
            </legend>

            {/* Station Name (TH/EN) */}
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-gray-600">{t("station_name")} (TH)</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={stationNameTh}
                  onChange={(e) => setStationNameTh(e.target.value)}
                  placeholder="สามย่าน"
                />
              </label>

              <label className="text-sm">
                <span className="text-gray-600">{t("station_name")} (EN)</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={stationNameEn}
                  onChange={(e) => setStationNameEn(e.target.value)}
                  placeholder="SamYan"
                />
              </label>
            </div>

            {/* Station ID / IP */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-gray-600">{t("station_id")}</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  placeholder="13"
                />
              </label>

              <label className="text-sm">
                <span className="text-gray-600">{t("station_ip")}</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={stationIp}
                  onChange={(e) => setStationIp(e.target.value)}
                  placeholder="192.168.1.100"
                  inputMode="numeric"
                />
              </label>
            </div>

            {/* Heartbeat / Probe Ports */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-gray-600">{t("heartbeat_port")}</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  type="number"
                  min={1}
                  max={65535}
                  value={heartbeatPort}
                  onChange={(e) =>
                    setHeartbeatPort(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="3070"
                  inputMode="numeric"
                />
              </label>

              <label className="text-sm">
                <span className="text-gray-600">{t("device_probe_port")}</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  type="number"
                  min={1}
                  max={65535}
                  value={deviceProbePort}
                  onChange={(e) =>
                    setDeviceProbePort(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="22 / 2222"
                  inputMode="numeric"
                />
              </label>
            </div>

            {/* Fullscreen toggle */}
            <div className="mt-3">
              <label className="inline-flex items-center gap-2 text-sm select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={fullScreen}
                  onChange={(e) => setFullScreen(e.target.checked)}
                />
                <span>{t("fullscreen") || "Fullscreen"}</span>
              </label>
              <div className="mt-1 text-xs text-gray-500">
                {t("note") || "Note"}: {t("fullscreen")}{" "}
                {t("will_apply_next_launch") || "will apply on next launch."}
              </div>
            </div>
          </fieldset>
        </>
      )}

      {tab === "devices" && (
        <fieldset className="rounded-xl border p-3">
          <legend className="px-2 text-sm font-semibold">
            {t("devices") || "Devices"}
          </legend>

          {/* Filter + Add */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder={(t("search") as string) || "Search…"}
              value={devFilter}
              onChange={(e) => setDevFilter(e.target.value)}
            />
            <button
              onClick={addDevice}
              className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
            >
              {t("add") || "Add"}
            </button>
            {hasDeviceError && (
              <span className="text-xs text-red-600">
                {(t("fix_device_rows") as string) ||
                  "Please fix device rows (id/ip required; id must be unique)."}
              </span>
            )}
          </div>

          {/* Editable table */}
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">ID *</th>
                  <th className="p-2 border">IP *</th>
                  <th className="p-2 border">Name</th>
                  <th className="p-2 border">Gate</th>
                  <th className="p-2 border">Side</th>
                  <th className="p-2 border">Type</th>
                  <th className="p-2 border w-16"></th>
                </tr>
              </thead>
              <tbody>
                {visibleDevices.map((d, idxVisible) => {
                  const idx = devices.indexOf(d);
                  const err = deviceErrors[idx] || [];
                  const hasErr = err.length > 0;
                  return (
                    <tr key={`dev-${idx}`} className={hasErr ? "bg-red-50" : ""}>
                      <td className="p-2 border">{idx + 1}</td>
                      <td className="p-2 border">
                        <input
                          className="w-full border rounded px-2 py-1"
                          value={d.id}
                          onChange={updateDevice(idx, "id")}
                          placeholder="G1-01"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          className="w-full border rounded px-2 py-1"
                          value={d.ip}
                          onChange={updateDevice(idx, "ip")}
                          placeholder="192.168.1.101"
                          inputMode="numeric"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          className="w-full border rounded px-2 py-1"
                          value={d.name || ""}
                          onChange={updateDevice(idx, "name")}
                          placeholder="GATE SAMYAN 1"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          className="w-full border rounded px-2 py-1"
                          value={d.gateId || ""}
                          onChange={updateDevice(idx, "gateId")}
                          placeholder="G1"
                        />
                      </td>
                      <td className="p-2 border">
                        <select
                          className="w-full border rounded px-2 py-1"
                          value={d.side || ""}
                          onChange={updateDevice(idx, "side")}
                        >
                          <option value="">{t("select") || "—"}</option>
                          <option value="north">{t("north") || "North"}</option>
                          <option value="south">{t("south") || "South"}</option>
                        </select>
                      </td>
                      <td className="p-2 border">
                        <input
                          className="w-full border rounded px-2 py-1"
                          value={d.type || ""}
                          onChange={updateDevice(idx, "type")}
                          placeholder="entry / emv_gate"
                        />
                      </td>
                      <td className="p-2 border text-right">
                        <button
                          onClick={() => removeDevice(idx)}
                          className="px-2 py-1 rounded border hover:bg-gray-50"
                          title={t("delete") as string}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {visibleDevices.length === 0 && (
                  <tr>
                    <td className="p-3 text-center text-gray-500" colSpan={8}>
                      {t("no_data") || "No devices"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            * {t("required") || "required"} — {t("note") || "Note"}:{" "}
            {(t("devices_tab_note") as string) ||
              "This saves to config.json → devices[]. Runtime fields (status, lastHeartbeat, deviceIp) are not stored here."}
          </div>
        </fieldset>
      )}

      {/* Save */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={askConfirmSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>

      {/* Modal */}
      <StatusModal
        open={m.open}
        variant={m.variant}
        title={m.title}
        message={m.message}
        onClose={() => setM((x) => ({ ...x, open: false }))}
        onConfirm={m.onConfirm}
        confirmText={(t("confirm") as string) || "Confirm"}
        cancelText={(t("cancel") as string) || "Cancel"}
      />
    </section>
  );
}
