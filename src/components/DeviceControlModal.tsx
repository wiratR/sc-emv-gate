// src/components/DeviceControlModal.tsx

import { useEffect, useState } from "react";

import { Device } from "@/models/device";
import Modal from "@/components/Modal";
import StatusModal from "@/components/StatusModal";
import StatusPill from "@/components/StatusPill";
import TerminalModal from "@/components/TerminalModal";
import { useAuth } from "@/auth/AuthContext";
import useEffectiveStatus from "@/hooks/useEffectiveStatus";
import { useI18n } from "@/i18n/I18nProvider";
import useProbePort from "@/hooks/useProbePort";

type Operation =
  | "inservice_entry"
  | "inservice_exit"
  | "inservice_bidirect"
  | "out_of_service"
  | "station_close"
  | "emergency";

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
  const [op, setOp] = useState<Operation>("inservice_bidirect");
  const [busy, setBusy] = useState(false);
  const [loadingLog, setLoadingLog] = useState(false);

  // Current operation (for display) + loading state
  const [currentOp, setCurrentOp] = useState<Operation | null>(null);
  const [loadingOp, setLoadingOp] = useState(false);

  const [m, setM] = useState<ModalState>({
    open: false,
    variant: "info",
    title: "",
    message: "",
  });
  
  const probePort = useProbePort(22); // default 22; จะ override ด้วย config

  // ใช้ hook (รองรับ device=null ได้)
  const { status, hb, probe, refreshNow } = useEffectiveStatus(device ?? undefined, {
    label: device ? `modal:${device.id}:${device.gateId ?? device.name}` : "modal:-",
    refreshMs: open ? 6000 : 0,
    tcpPort: probePort,
    timeoutMs: 1200,
    staleMs: 60_000,
    offlineMs: 300_000,
  });

  // ควบคุมได้เฉพาะตอน online
  const canControl = status === "online";

  // ───────────────── Type guard & labels ─────────────────
  const isOp = (x: any): x is Operation =>
    x === "inservice_entry" ||
    x === "inservice_exit" ||
    x === "inservice_bidirect" ||
    x === "out_of_service" ||
    x === "station_close" ||
    x === "emergency";

  const opLabel = (o: Operation) => {
    switch (o) {
      case "inservice_entry":    return (t("op_inservice_entry") as string) || "Inservice – Entry";
      case "inservice_exit":     return (t("op_inservice_exit") as string) || "Inservice – Exit";
      case "inservice_bidirect": return (t("op_inservice_bi") as string)   || "Inservice – Bi-direction";
      case "out_of_service":     return (t("op_out_of_service") as string) || "Out of service";
      case "station_close":      return (t("op_station_close") as string)  || "Station Close";
      case "emergency":          return (t("op_emergency") as string)      || "Emergency";
    }
  };

  // ─────────────── โหลดสถานะ operation ปัจจุบันเมื่อเปิดโมดัล ───────────────
  useEffect(() => {
    if (!open || !device?.id) return;

    let cancelled = false;
    setLoadingOp(true);

    window.devices?.getCurrentOperation?.(device.id)
      .then((res) => {
        if (cancelled) return;

        if (res?.ok) {
          const serverOp = res.operation;
          window.logger?.info?.("[modal] getCurrentOperation", { deviceId: device.id, op: serverOp });

          if (isOp(serverOp)) {
            setCurrentOp(serverOp);
            setOp(serverOp); // ตั้ง dropdown ให้ตรงกับสถานะล่าสุด
          } else {
            setCurrentOp(null);
          }
        } else {
          window.logger?.warn?.("[modal] getCurrentOperation failed", { deviceId: device.id, error: res?.error });
          setCurrentOp(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOp(false);
      });

    return () => { cancelled = true; };
  }, [open, device?.id]);

  // ─────────────── Reboot ───────────────
  const doReboot = async () => {
    if (!device) return;
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
          message: res?.error || (t("reboot_failed") as string) || "Reboot failed",
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
    if (!isMaint || !device) return;
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
    if (!device?.deviceIp) {
      setM({
        open: true,
        variant: "error",
        title: t("error") as string,
        message: "No device IP",
      });
      return;
    }

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

  // ถ้า modal ยังไม่เปิดหรือยังไม่มี device → render แค่ StatusModal ไว้
  if (!open || !device) {
    return (
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
    );
  }

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
              effectiveStatus: status,
            });
            setM({
              open: true,
              variant: "info",
              title: t("info") as string,
              message: (t("operation_blocked") as string) || (t("not_online_warning") as string),
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
        {/* Header: สรุป & badge */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <div>
              <span className="text-gray-500">{t("device_id")}:</span>{" "}
              <span className="text-gray-900">{device.id}</span>
            </div>
            <div>
              <span className="text-gray-500">{t("device_gate")}:</span>{" "}
              <span className="text-gray-900">{device.gateId ?? "-"}</span>
            </div>
            <div>
              <span className="text-gray-500">{t("device_ip")}:</span>{" "}
              <span className="text-gray-900">{device.deviceIp ?? "-"}</span>
            </div>
          </div>
          <StatusPill status={status} title={`effective: ${status}`} />
        </div>

        {/* แจ้งเตือนควบคุมไม่ได้ */}
        {!canControl && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm px-3 py-2">
            {t("not_online_warning")}
          </div>
        )}

        {/* heartbeat & debug */}
        <div className="mt-3 text-xs text-gray-600">
          <div>
            HB:&nbsp;
            <span className="text-gray-900">
              {hb?.agoText ? `${hb.agoText} (${device.lastHeartbeat ?? "-"})` : device.lastHeartbeat ?? "-"}
            </span>
          </div>
          <div className="mt-0.5">
            Probe:&nbsp;
            <span className="text-gray-900">
              {"reachable" in (probe || {}) && typeof (probe as any).reachable === "boolean"
                ? ((probe as any).reachable ? `reachable ~${(probe as any).rttMs} ms` : "unreachable")
                : "—"}
            </span>
            <button
              type="button"
              onClick={refreshNow}
              className="ml-2 inline-flex items-center gap-1 underline hover:no-underline"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* เลือกคำสั่ง Gate — ใช้ Dropdown + Optgroup */}
        <fieldset className="mt-4 rounded-xl border p-3">
          <legend className="px-2 text-sm font-semibold">{t("gate_operation_control")}</legend>

          {/* แสดง current operation */}
          <div className="mt-1 text-xs text-gray-500">
            {(t("current_operation") as string) || "Current operation"}:{" "}
            {loadingOp ? (t("loading") as string) || "Loading..." : (
              <span className="text-gray-900">
                {currentOp ? opLabel(currentOp) : "—"}
              </span>
            )}
          </div>

          <label className="mt-2 block text-sm">
            <span className="text-gray-600">{t("operation")}</span>
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2 bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
              value={op}
              onChange={(e) => setOp(e.target.value as Operation)}
              disabled={!canControl}
            >
              <optgroup label={(t("inservice_group") as string) || "Inservice"}>
                <option value="inservice_entry">{t("op_inservice_entry")}</option>
                <option value="inservice_exit">{t("op_inservice_exit")}</option>
                <option value="inservice_bidirect">{t("op_inservice_bi")}</option>
              </optgroup>
              <optgroup label={(t("other_ops_group") as string) || "Other"}>
                <option value="out_of_service">{t("op_out_of_service")}</option>
                <option value="station_close">{t("op_station_close")}</option>
                <option value="emergency">{t("op_emergency")}</option>
              </optgroup>
            </select>
          </label>
        </fieldset>

        {/* Maintenance tools */}
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

              {status === "online" && device.deviceIp && (
                <button
                  onClick={() => setShowTerm(true)}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                >
                  {t("open_console")}
                </button>
              )}

              {status === "online" && device.deviceIp && (
                <button
                  onClick={handleGetDeviceLog}
                  disabled={loadingLog || !device.deviceIp}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60"
                >
                  {loadingLog ? (t("getting_logs") as string) : (t("get_device_log") as string)}
                </button>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-400">{t("console_hint")}</div>
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

      {/* Status Modal */}
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
