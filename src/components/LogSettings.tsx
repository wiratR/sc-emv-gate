// src/components/LogSettings.tsx

import { useEffect, useState } from "react";

import StatusModal from "@/components/StatusModal";
import { useI18n } from "@/i18n/I18nProvider";

const LEVELS = ["debug", "info", "warn", "error"] as const;
type Level = (typeof LEVELS)[number];
type StationName = string | { th?: string; en?: string };

type Variant = "info" | "success" | "error" | "confirm";
type ModalState = {
  open: boolean;
  variant: Variant;
  title: string;
  message: string;
  onConfirm?: () => void | Promise<void>;
};

function clampPort(n: number) {
  if (!Number.isFinite(n)) return NaN;
  if (n < 1 || n > 65535) return NaN;
  return Math.floor(n);
}

function isStationNameObj(
  v: unknown
): v is { th?: string; en?: string } {
  return !!v && typeof v === "object";
}


export default function LogSettings() {
  const { t } = useI18n();

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

        // ✅ robust: รองรับทั้ง string / object / nullish
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

        // ค่าเริ่มต้นหากไม่มีในไฟล์
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
      }

      if (info?.ok) {
        setLogDir(info.logDir);
        setLogFile(info.logFile);
      }
    })();
  }, []);

  const doSave = async () => {
    // validate ports
    const hb = clampPort(Number(heartbeatPort));
    const dp = clampPort(Number(deviceProbePort));

    if (!Number.isFinite(hb) || !Number.isFinite(dp)) {
      setM({
        open: true,
        variant: "error",
        title: t("error") as string,
        message: (t("invalid_port") as string) || "Invalid port(s). Ports must be 1–65535.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        logLevel: level,
        stationName: { th: stationNameTh || "", en: stationNameEn || "" },
        stationId: stationId || "",
        stationIp: stationIp || "",
        fullScreen: !!fullScreen,
        heartbeatPort: hb,
        deviceProbePort: dp,
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
        `HB:${heartbeatPort || "-"}, ` +
        `Probe:${deviceProbePort || "-"}) ` +
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

  return (
    <section className="p-4 bg-white rounded-2xl border shadow-sm">
      {/* ── Log settings ─────────────────────────────────────── */}
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

      {/* ── Station & Display ───────────────────────────────── */}
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
            {t("note") || "Note"}: {t("fullscreen")} {t("will_apply_next_launch") || "will apply on next launch."}
          </div>
        </div>
      </fieldset>

      {/* Save all (with confirm) */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={askConfirmSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>

      {/* Modal รวม confirm/success/error */}
      <StatusModal
        open={m.open}
        variant={m.variant}
        title={m.title}
        message={m.message}
        onClose={() => setM((x) => ({ ...x, open: false }))}
        onConfirm={m.onConfirm}
        confirmText={t("confirm") as string}
        cancelText={t("cancel") as string}
      />
    </section>
  );
}
