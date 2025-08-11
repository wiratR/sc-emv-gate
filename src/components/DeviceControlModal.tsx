// src/components/DeviceControlModal.tsx

import { Device } from "@/models/device";
import Modal from "@/components/Modal";
import TerminalModal from "@/components/TerminalModal"; // ✅ เพิ่ม import
import { statusClass } from "@/utils/status";
import { summarizeHeartbeat } from "@/utils/deviceHeartBeatCheck"; // ✅ ชื่อไฟล์ตรง
import { useAuth } from "@/auth/AuthContext";
import { useState } from "react";

type Operation = "inservice" | "station_close" | "emergency";

type Props = {
  open: boolean;
  device: Device | null;
  onClose: () => void;
  onEnter?: (d: Device, op: Operation) => void;
};

const OP_LABEL: Record<Operation, string> = {
  inservice: "Inservice",
  station_close: "Station Close",
  emergency: "Emergency",
};

export default function DeviceControlModal({ open, device, onClose, onEnter }: Props) {
  const { user } = useAuth();
  const isMaint = user?.role === "maintenance";
  const [showTerm, setShowTerm] = useState(false);

  const [op, setOp] = useState<Operation>("inservice");
  const [busy, setBusy] = useState(false);

  if (!device) return null;

  const hb = summarizeHeartbeat(device.status, device.lastHeartbeat, {
    staleMs: 60_000,
    offlineMs: 300_000,
  });

  const canControl = device.status === "online" && hb.status === "online";

  const handleReboot = async () => {
    if (!isMaint) return;
    const ok = confirm(`Reboot gate "${device.name}" ?`);
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
        Cancel
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
        Enter
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title={`Gate Operation – ${device.name}`} footer={footer} size="md">
      {/* สถานะย่อ */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <div><span className="text-gray-500">ID:</span> <span className="text-gray-900">{device.id}</span></div>
          <div><span className="text-gray-500">Gate:</span> <span className="text-gray-900">{device.gateId ?? "-"}</span></div>
          <div><span className="text-gray-500">IP:</span> <span className="text-gray-900">{device.deviceIp ?? "-"}</span></div>
        </div>
        <span className={`inline-flex items-center text-xs border px-2 py-0.5 rounded-full ${statusClass(hb.status)}`}>
          {hb.status.toUpperCase()}
        </span>
      </div>

      {/* ควบคุมไม่ได้ถ้าไม่ online */}
      {!canControl && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm px-3 py-2">
          This device is not <b>ONLINE</b>. Operation control is disabled.
        </div>
      )}

      {/* heartbeat */}
      <div className="mt-3 text-xs text-gray-600">
        <div>Heartbeat: <span className="text-gray-900">{device.lastHeartbeat ?? "-"}</span></div>
        <div>Last seen: <span className="text-gray-900">{hb.agoText}</span></div>
      </div>

      {/* ดรอปดาวน์เลือกคำสั่ง Gate */}
      <fieldset className="mt-4 rounded-xl border p-3">
        <legend className="px-2 text-sm font-semibold">Gate Operation Control</legend>
        <label className="mt-2 block text-sm">
          <span className="text-gray-600">Operation</span>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400"
            value={op}
            onChange={(e) => setOp(e.target.value as Operation)}
            disabled={!canControl}
          >
            <option value="inservice">{OP_LABEL.inservice}</option>
            <option value="station_close">{OP_LABEL.station_close}</option>
            <option value="emergency">{OP_LABEL.emergency}</option>
          </select>
        </label>
      </fieldset>

      {/* เฉพาะ Maintenance: Reboot & Console */}
      {isMaint && (
        <fieldset className="mt-4 rounded-xl border p-3">
          <legend className="px-2 text-sm font-semibold">Maintenance Tools</legend>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleReboot}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
            >
              Reboot Gate
            </button>

            {device.status === "online" && device.deviceIp && (
              <button
                onClick={() => setShowTerm(true)}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Open Console
              </button>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Console uses xterm.js + node-pty (SSH via system ssh).
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
