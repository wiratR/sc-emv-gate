// src/utils/status.ts

export type DeviceStatus = "online" | "offline" | "fault" | "maintenance";

// ลำดับความสำคัญของสถานะ (ใช้ในการ sort)
export const STATUS_ORDER: Record<DeviceStatus, number> = {
  online: 1,
  maintenance: 2,
  fault: 3,
  offline: 4,
};

// คลาสสีพื้นหลัง + ตัวหนังสือของแต่ละสถานะ
export const statusClass = (s: DeviceStatus) =>
  ({
    online: "bg-green-100 text-green-800 border-green-200",
    offline: "bg-gray-100 text-gray-800 border-gray-200",
    fault: "bg-red-100 text-red-800 border-red-200",
    maintenance: "bg-amber-100 text-amber-900 border-amber-200",
  }[s]);

// คลาสสีของ Summary Card
export const summaryToneClass = (tone?: DeviceStatus) =>
  tone === "online"
    ? "bg-green-50 text-green-800 border-green-200"
    : tone === "maintenance"
    ? "bg-amber-50 text-amber-900 border-amber-200"
    : tone === "fault"
    ? "bg-red-50 text-red-800 border-red-200"
    : tone === "offline"
    ? "bg-gray-50 text-gray-800 border-gray-200"
    : "bg-white text-gray-900";
