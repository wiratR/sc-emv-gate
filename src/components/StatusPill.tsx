// src/components/StatusPill.tsx

import { useMemo } from "react";
import { statusClass, type EffectiveStatus } from "@/utils/status";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  /** สถานะรวม (รองรับ "stale") */
  status: EffectiveStatus;
  /** ขนาดตัวอักษร/ระยะห่าง */
  size?: "xs" | "sm" | "md";
  /** ข้อความที่แสดง (ถ้าไม่ส่ง จะพยายามแปลจาก i18n แล้วค่อย fallback) */
  text?: string;
  /** ทำตัวอักษรเป็นตัวพิมพ์ใหญ่ */
  uppercase?: boolean;
  /** คลาสเสริม */
  className?: string;
  /** title สำหรับ hover tooltip */
  title?: string;
};

const SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  xs: "text-[10px] px-2 py-0.5",
  sm: "text-xs px-2.5 py-0.5",
  md: "text-sm px-3 py-1",
};

export default function StatusPill({
  status,
  size = "sm",
  text,
  uppercase = true,
  className = "",
  title,
}: Props) {
  const { t } = useI18n();

  const label = useMemo(() => {
    if (typeof text === "string" && text.length > 0) return text;
    // พยายามดึงจาก i18n ก่อน หากไม่มีคีย์ → fallback เป็นชื่อสถานะ
    const raw = (t(status) as string) || status;
    return uppercase ? raw.toUpperCase() : raw;
  }, [text, t, status, uppercase]);

  const pillCls = useMemo(
    () =>
      [
        "inline-flex items-center rounded-full border",
        statusClass(status),
        SIZE_CLASS[size],
        className,
      ].join(" "),
    [status, size, className]
  );

  return (
    <span className={pillCls} title={title || label} aria-label={label}>
      {label}
    </span>
  );
}
