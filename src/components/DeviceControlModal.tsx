// src/components/DeviceControlModal.tsx

import useEffectiveStatus, { isOnline } from "@/hooks/useEffectiveStatus";

import { Device } from "@/models/device";
import Modal from "@/components/Modal";
import StatusModal from "@/components/StatusModal";
import TerminalModal from "@/components/TerminalModal";
import { statusClass } from "@/utils/status";
import { useAuth } from "@/auth/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import { useState } from "react";

type Operation = "inservice" | "station_close" | "emergency";

type Props = {
  open: boolean;
  device: Device | null;
  onClose: () => void;
  onEnter?: (d: Device, op: Operation) => void;
};

type Variant = "info" | "success" | "error" | "confirm";
type ModalState = {
  open: boolean;
  variant: Variant;
  title: string;
  message: React.ReactNode;
  onConfirm?: () => void | Promise<void>;
};

export default function DeviceControlModal({ open, device, onClose, onEnter }: Props) {
  const { user } = useAuth();
  const { t } = useI18n();
  const isMaint = user?.role === "maintenance";

  const [showTerm, setShowTerm] = useState(false);
  const [op, setOp] = useState<Operation>("inservice");
  const [busy, setBusy] = useState(false);
  const [loadingLog, setLoadingLog] = useState(false);

  // 🔐 เรียก hook เสมอ (รองรับ device = null ภายใน)
  const eff = useEffectiveStatus(device, {
    pollingMs: 6000,
    staleMs: 60_000,
    offlineMs: 300_000,
    tcpPort: 22,
    timeoutMs: 1200,
    logKey: device ? `modal:${device.id}:${device.name}` : "modal:(no-device)",
  });
  const canControl = isOnline(eff.status);

  // StatusModal state
  const [m, setM] = useState<ModalState>({
    open: false,
    variant: "info",
    title: "",
    message: "",
  });

  // ─────── ถ้าไม่มี device ให้รีเทิร์นโมดัลว่าง ๆ (แต่ hook ถูกเรียกไปแล้วด้านบน จึงไม่ผิดกติกา Hooks)
  if (!device) return null;

  // ───────────────────────── Reboot ─────────────────────────
  const doReboot = async () => {
    try {
      setBusy(true);
      window.logger?.info?.("[device] reboot requested", { deviceId: device.id });
      const res = await window.devices?.reboot?.(device.id);
      if (!res?.ok) {
        window.logger?.error?.("[device] reboot failed", { deviceId: device.id, error: res?.error });
        setM({
          open: true,
          variant: "error",
          title: t("error") as string,
          message: res?.error || "Reboot failed",
        });
      } else {
        window.logger?.info?.("[device] reboot ok", { deviceId: device.id });
        setM({
          open: true,
          variant: "success",
          title: t("success") as string,
          message: `${t("reboot_gate")} – ${device.name}`,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const askReboot = () => {
    if (!isMaint) return;
    window.logger?.info?.("[modal] confirm reboot open", { deviceId: device.id, name: device.name });
    setM({
      open: true,
      variant: "confirm",
      title: t("reboot_gate") as string,
      message: `${t("reboot_gate")} "${device.name}" ?`,
      onConfirm: async () => {
        setM((x) => ({ ...x, open: false }));
        await doReboot();
      },
    });
  };

  // ─────────────── Get Device Log ───────────────
  const handleGetDeviceLog = async () => {
    if (!device.deviceIp) {
      setM({
        open: true,
        variant: "error",
        title: t("error") as string,
        message: "No device IP",
      });
      return;
    }

    // เปิดโมดัลสถานะกำลังทำงาน
    setLoadingLog(true);
    setM({
      open: true,
      variant: "info",
      title: t("info") as string,
      message: (
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" />
          </svg>
          <span>{t("getting_logs") as string}</span>
        </div>
      ),
    });

    try {
      const res = await window.devices?.getDeviceLog?.({ host: device.deviceIp });
      if (res?.ok) {
        setM({
          open: true,
          variant: "success",
          title: t("success") as string,
          message: (
            <div className="text-sm">
              <div>{t("device_log_ok") as string}</div>
              <div className="mt-1 font-mono text-xs break-all">{res.path}</div>
            </div>
          ),
        });
      } else {
        setM({
          open: true,
          variant: "error",
          title: t("error") as string,
          message: res?.error || (t("device_log_failed") as string),
        });
      }
    } finally {
      setLoadingLog(false);
    }
  };

  // ─────────────── Footer ───────────────
  const footer = (
    <>
      <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-gray-50">
        {t("cancel")}
      </button>
      <button
        onClick={() => {
          if (!canControl) {
            window.logger?.warn?.("[device] gate op blocked (not online)", {
              deviceId: device.id,
              deviceStatus: device.status,
              effectiveStatus: eff.status,
            });
            setM({
              open: true,
              variant: "info",
              title: t("info") as string,
              message: t("not_online_warning") as string,
            });
            return;
          }
          window.logger?.info?.("[device] gate op submit", { deviceId: device.id, op });
          onEnter?.(device, op);
          onClose();
        }}
        disabled={!canControl}
        className={`px-4 py-2 rounded-lg text-white ${
          canControl ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        {t("enter")}
      </button>
    </>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`${t("gate_operation_title")} – ${device.name}`}
        footer={footer}
        size="md"
      >
        {/* สถานะย่อ */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <div>
              <span className="text-gray-200">{t("device_id")}:</span>{" "}
              <span className="text-white">{device.id}</span>
            </div>
            <div>
              <span className="text-gray-200">{t("device_gate")}:</span>{" "}
              <span className="text-white">{device.gateId ?? "-"}</span>
            </div>
            <div>
              <span className="text-gray-200">{t("device_ip")}:</span>{" "}
              <span className="text-white">{device.deviceIp ?? "-"}</span>
            </div>
          </div>
          <span className={`inline-flex items-center text-xs border px-2 py-0.5 rounded-full ${statusClass(eff.status)}`}>
            {eff.status.toUpperCase()}
          </span>
        </div>

        {/* แจ้งเตือนควบคุมไม่ได้ */}
        {!canControl && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm px-3 py-2">
            {t("not_online_warning")}
          </div>
        )}

        {/* heartbeat */}
        <div className="mt-3 text-xs text-gray-400">
          <div>
            {t("device_heartbeat")}: <span className="text-white">{device.lastHeartbeat ?? "-"}</span>
          </div>
          <div>
            {t("last_seen")}: <span className="text-white">{eff.hb.agoText}</span>
          </div>
        </div>

        {/* เลือกคำสั่ง Gate */}
        <fieldset className="mt-4 rounded-xl border p-3">
          <legend className="px-2 text-sm font-semibold">{t("gate_operation_control")}</legend>
          <label className="mt-2 block text-sm">
            <span className="text-gray-200">{t("operation")}</span>
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400"
              value={op}
              onChange={(e) => setOp(e.target.value as Operation)}
              disabled={!canControl}
            >
              <option value="inservice">{t("op_inservice")}</option>
              <option value="station_close">{t("op_station_close")}</option>
              <option value="emergency">{t("op_emergency")}</option>
            </select>
          </label>
        </fieldset>

        {/* เฉพาะ Maintenance: Reboot / Console / Get Device Log */}
        {isMaint && (
          <fieldset className="mt-4 rounded-xl border p-3">
            <legend className="px-2 text-sm font-semibold">{t("maintenance_tools")}</legend>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={askReboot}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {t("reboot_gate")}
              </button>

              {isOnline(eff.status) && device.deviceIp && (
                <button
                  onClick={() => setShowTerm(true)}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                >
                  {t("open_console")}
                </button>
              )}

              <button
                onClick={handleGetDeviceLog}
                disabled={loadingLog || !device.deviceIp}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60"
              >
                {loadingLog ? (t("getting_logs") as string) : (t("get_device_log") as string)}
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">{t("console_hint")}</div>
          </fieldset>
        )}

        {/* Terminal Modal */}
        <TerminalModal
          open={showTerm}
          sshHost={device.deviceIp}
          title={`SSH – ${device.name}`}
          onClose={() => setShowTerm(false)}
        />
      </Modal>

      {/* Status Modal (confirm/info/success/error) */}
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
    </>
  );
}
