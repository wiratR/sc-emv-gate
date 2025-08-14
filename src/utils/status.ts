// src/utils/status.ts

// สถานะที่มาจากอุปกรณ์ตรง ๆ
export type DeviceStatus = "online" | "offline" | "fault" | "maintenance";

// สถานะรวม (effective) ที่มี "stale" เพิ่มเข้ามา
export type EffectiveStatus = DeviceStatus | "stale";

/** ลำดับความสำคัญของสถานะ (ใช้ในการ sort) — แบบเดิม */
export const STATUS_ORDER: Record<DeviceStatus, number> = {
  online: 1,
  maintenance: 2,
  fault: 3,
  offline: 4,
};

/** ลำดับความสำคัญเมื่อมี stale เข้ามา */
export const EFFECTIVE_STATUS_ORDER: Record<EffectiveStatus, number> = {
  online: 1,
  maintenance: 2,
  fault: 3,
  stale: 3.5,
  offline: 4,
};

// ── สีสำหรับ badge/pill ─────────────────────────────────────────

const BASE_STATUS_CLASSES: Record<DeviceStatus, string> = {
  online: "bg-green-100 text-green-800 border-green-200",
  offline: "bg-gray-100 text-gray-800 border-gray-200",
  fault: "bg-red-100 text-red-800 border-red-200",
  maintenance: "bg-amber-100 text-amber-900 border-amber-200",
};

const STALE_PILL_CLASS =
  "bg-amber-100 text-amber-900 border-amber-200";

/** คืนคลาสสีสำหรับ badge/pill ตามสถานะ (รองรับ stale) */
export const statusClass = (s: EffectiveStatus): string =>
  s === "stale" ? STALE_PILL_CLASS : BASE_STATUS_CLASSES[s as keyof typeof BASE_STATUS_CLASSES];

// ── สีสำหรับ Summary Card ───────────────────────────────────────

const BASE_SUMMARY_CLASSES: Record<DeviceStatus, string> = {
  online: "bg-green-50 text-green-800 border-green-200",
  maintenance: "bg-amber-50 text-amber-900 border-amber-200",
  fault: "bg-red-50 text-red-800 border-red-200",
  offline: "bg-gray-50 text-gray-800 border-gray-200",
};

const STALE_SUMMARY_CLASS =
  "bg-amber-50 text-amber-900 border-amber-200";

/** คลาสสำหรับ Summary Card (รองรับ stale; ไม่ส่ง tone = ขาวปกติ) */
export const summaryToneClass = (tone?: EffectiveStatus): string => {
  if (!tone) return "bg-white text-gray-900";
  return tone === "stale" ? STALE_SUMMARY_CLASS : BASE_SUMMARY_CLASSES[tone as keyof typeof BASE_SUMMARY_CLASSES];
};

/** ใช้เมื่ออยาก map 'stale' เป็นกลุ่มใกล้เคียง (เช่น offline) */
export const toDeviceStatusForUi = (s: EffectiveStatus): DeviceStatus =>
  s === "stale" ? "offline" : s;
