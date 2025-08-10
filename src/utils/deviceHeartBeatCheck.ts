// src/utils/deviceHeartBeatCheck.ts
// ยูทิลิตี้สำหรับเช็ค lastHeartbeat ของอุปกรณ์ และอนุมานสถานะจาก "ความสดใหม่" ของ heartbeat

import type { DeviceStatus } from "@/utils/status";

export type HeartbeatThresholds = {
  /** เกินกี่ ms ถึงจะถือว่าเริ่ม "stale" (ยังพอออนไลน์ แต่เริ่มช้า/น่าเป็นห่วง) */
  staleMs: number;
  /** เกินกี่ ms ถึงจะถือว่า "offline" */
  offlineMs: number;
};

const DEFAULT_THRESHOLDS: HeartbeatThresholds = {
  staleMs: 30_000,      // 30 วินาที
  offlineMs: 120_000,   // 2 นาที
};

/** แปลง ISO string → Date อย่างปลอดภัย (ผิดรูปให้ null) */
export function parseHeartbeat(ts?: string | null): Date | null {
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isFinite(+d) ? d : null;
}

/** คำนวณ ms ที่ผ่านไปตั้งแต่ heartbeat ล่าสุด (ไม่รู้เวลาก็คืน null) */
export function msSinceHeartbeat(lastHeartbeat?: string | null, now: Date = new Date()): number | null {
  const d = parseHeartbeat(lastHeartbeat);
  if (!d) return null;
  return Math.max(0, now.getTime() - d.getTime());
}

/** humanize เช่น "3m 12s ago" / "just now" / "-" */
export function humanizeAgo(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1_500) return "just now";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  if (m === 0) return `${s}s ago`;
  return `${m}m ${ss}s ago`;
}

/**
 * อนุมานสถานะจาก heartbeat
 * - ถ้าเดิมเป็น maintenance/fault จะ "ไม่ทับ" (คงสถานะเดิมไว้) เว้นแต่ตั้งค่า override
 * - ถ้าไม่มี heartbeat เลย → offline
 * - ภายใน staleMs → online, ระหว่าง staleMs..offlineMs → maintenance (หรือ "stale"), เกิน offlineMs → offline
 */
export function deriveStatusFromHeartbeat(
  current: DeviceStatus,
  lastHeartbeat?: string | null,
  opts?: Partial<HeartbeatThresholds> & { overrideFault?: boolean; staleMapsTo?: DeviceStatus }
): DeviceStatus {
  const { staleMs, offlineMs } = { ...DEFAULT_THRESHOLDS, ...opts };
  const overrideFault = !!opts?.overrideFault;
  const staleMapsTo: DeviceStatus = opts?.staleMapsTo ?? "maintenance";

  // ถ้าเป็น maintenance อยู่แล้ว → คงไว้
  if (current === "maintenance") return "maintenance";
  // fault คงไว้ เว้นแต่สั่ง override
  if (current === "fault" && !overrideFault) return "fault";

  const elapsed = msSinceHeartbeat(lastHeartbeat);
  if (elapsed == null) return "offline";
  if (elapsed >= offlineMs) return "offline";
  if (elapsed >= staleMs) return staleMapsTo;
  return "online";
}

/**
 * บอกว่าอีกกี่ ms สถานะจะ "ขยับขั้น" (fresh→stale หรือ stale→offline)
 * ใช้ตั้ง setTimeout เพื่อรีเฟรชหน้าจอพอดีจังหวะ
 * คืน null ถ้าคำนวณไม่ได้
 */
export function msToNextFlip(
  lastHeartbeat?: string | null,
  opts?: Partial<HeartbeatThresholds>,
  now: Date = new Date()
): number | null {
  const { staleMs, offlineMs } = { ...DEFAULT_THRESHOLDS, ...opts };
  const d = parseHeartbeat(lastHeartbeat);
  if (!d) return null;

  const age = now.getTime() - d.getTime();
  if (age < 0) return 0;

  if (age < staleMs) {
    return Math.max(0, staleMs - age);
  }
  if (age < offlineMs) {
    return Math.max(0, offlineMs - age);
  }
  return null;
}

/** สะดวกๆ: สรุปข้อมูล heartbeat รวมทั้งสถานะที่อนุมาน และข้อความ "xx ago" */
export function summarizeHeartbeat(
  current: DeviceStatus,
  lastHeartbeat?: string | null,
  opts?: Partial<HeartbeatThresholds> & { overrideFault?: boolean; staleMapsTo?: DeviceStatus },
  now: Date = new Date()
) {
  const elapsed = msSinceHeartbeat(lastHeartbeat, now);
  const status = deriveStatusFromHeartbeat(current, lastHeartbeat, opts);
  const nextFlipIn = msToNextFlip(lastHeartbeat, opts, now);
  return {
    status,                 // สถานะหลังประเมิน heartbeat
    msAgo: elapsed,         // ms ที่ผ่านไป
    agoText: humanizeAgo(elapsed),
    nextFlipIn,             // อีกกี่ ms จะเปลี่ยนขั้น (ไว้ตั้ง timeout)
    lastAt: parseHeartbeat(lastHeartbeat)?.toISOString() ?? null,
  };
}
