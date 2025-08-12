// src/components/DeviceCard.tsx
import { Device } from "@/models/device";
import { sideLabel } from "@/utils/side";
import { statusClass } from "@/utils/status";
import { useI18n } from "@/i18n/I18nProvider";

export default function DeviceCard({ device, onClick }: { device: Device; onClick?: (d: Device) => void }) {
  const { t, lang } = useI18n();
  const labelCls = "font-bold text-gray-700"; // ⬅️ ทำให้ตัวหนา

  const badge = (
    <span className={`inline-flex items-center text-xs border px-2 py-0.5 rounded-full ${statusClass(device.status)}`}>
      {t(device.status).toUpperCase()}
    </span>
  );

  return (
    <button
      type="button"
      onClick={() => onClick?.(device)}
      className="text-left rounded-2xl border p-4 bg-white hover:shadow transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`${device.name} – ${t(device.status)}`}
      title={`${device.name} – ${t(device.status)}`}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium">{device.name}</div>
        {badge}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
        <div className={labelCls}>{t("device_id")}</div>
        <div className="text-gray-900">{device.id}</div>

        <div className={labelCls}>{t("device_gate")}</div>
        <div className="text-gray-900">{device.gateId ?? "-"}</div>

        <div className={labelCls}>{t("device_side")}</div>
        <div className="text-gray-900">{sideLabel(lang, device.side)}</div>

        <div className={labelCls}>{t("device_type")}</div>
        <div className="text-gray-900">{device.type ?? "-"}</div>

        <div className={labelCls}>{t("device_ip")}</div>
        <div className="text-gray-900">{device.deviceIp ?? "-"}</div>

        <div className={labelCls}>{t("device_heartbeat")}</div>
        <div className="text-gray-900">{device.lastHeartbeat ?? "-"}</div>

        {device.message && (
          <>
            <div className={labelCls}>{t("device_message")}</div>
            <div className="text-gray-900">{device.message}</div>
          </>
        )}
      </div>
    </button>
  );
}
