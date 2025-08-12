// src/components/DeviceControlModal.tsx

import { Device } from "@/models/device";
import Modal from "@/components/Modal";
import TerminalModal from "@/components/TerminalModal";
import { statusClass } from "@/utils/status";
import { summarizeHeartbeat } from "@/utils/deviceHeartBeatCheck";
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

export default function DeviceControlModal({ open, device, onClose, onEnter }: Props) {
  const { user } = useAuth();
  const { t } = useI18n();
  const isMaint = user?.role === "maintenance";

  const [showTerm, setShowTerm] = useState(false);
  const [op, setOp] = useState<Operation>("inservice");
  const [busy, setBusy] = useState(false);

  if (!device) return null;

  const hb = summarizeHeartbeat(device.status, device.lastHeartbeat, {
    staleMs: 60_000,
    offlineMs: 300_000,
  });

  // สั่งงานได้เฉพาะเมื่อสถานะ online
  const canControl = device.status === "online" && hb.status === "online";

  const handleReboot = async () => {
    if (!isMaint) return;
    const ok = confirm(`${t("reboot_gate")} "${device.name}" ?`);
    if (!ok) return;

    try {
      setBusy(true);
      window.logger?.info?.("[device] reboot requested", { deviceId: device.id });
      const res = await window.devices?.reboot?.(device.id);
      if (!res?.ok) {
        alert(res?.error || "Reboot failed");
        window.logger?.error?.("[device] reboot failed", { deviceId: device.id, error: res?.error });
      } else {
        window.logger?.info?.("[device] reboot ok", { deviceId: device.id });
      }
    } finally {
      setBusy(false);
    }
  };

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
              effectiveStatus: hb.status,
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
          <div><span className="text-gray-500">{t("device_id")}:</span> <span className="text-gray-900">{device.id}</span></div>
          <div><span className="text-gray-500">{t("device_gate")}:</span> <span className="text-gray-900">{device.gateId ?? "-"}</span></div>
          <div><span className="text-gray-500">{t("device_ip")}:</span> <span className="text-gray-900">{device.deviceIp ?? "-"}</span></div>
        </div>
        <span className={`inline-flex items-center text-xs border px-2 py-0.5 rounded-full ${statusClass(hb.status)}`}>
          {hb.status.toUpperCase()}
        </span>
      </div>

      {/* แจ้งเตือนควบคุมไม่ได้ */}
      {!canControl && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm px-3 py-2">
          {t("not_online_warning")}
        </div>
      )}

      {/* heartbeat */}
      <div className="mt-3 text-xs text-gray-600">
        <div>{t("device_heartbeat")}: <span className="text-gray-900">{device.lastHeartbeat ?? "-"}</span></div>
        <div>{t("last_seen")}: <span className="text-gray-900">{hb.agoText}</span></div>
      </div>

      {/* เลือกคำสั่ง Gate */}
      <fieldset className="mt-4 rounded-xl border p-3">
        <legend className="px-2 text-sm font-semibold">{t("gate_operation_control")}</legend>
        <label className="mt-2 block text-sm">
          <span className="text-gray-600">{t("operation")}</span>
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

      {/* เฉพาะ Maintenance: Reboot & Console */}
      {isMaint && (
        <fieldset className="mt-4 rounded-xl border p-3">
          <legend className="px-2 text-sm font-semibold">{t("maintenance_tools")}</legend>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleReboot}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {t("reboot_gate")}
            </button>

            {device.status === "online" && device.deviceIp && (
              <button
                onClick={() => setShowTerm(true)}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                {t("open_console")}
              </button>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {t("console_hint")}
          </div>
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
  );
}
