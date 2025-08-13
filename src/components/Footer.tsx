// src/components/Footer.tsx

import { useEffect, useMemo, useState } from "react";

type Props = {
  className?: string;
  /** เปลี่ยนโซนเวลาได้ (ดีฟอลต์ Asia/Bangkok) */
  tz?: string;
  /** บังคับ locale ได้ (ดีฟอลต์ใช้ของเบราว์เซอร์) */
  locale?: string;
};

export default function Footer({ className = "", tz = "Asia/Bangkok", locale }: Props) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // วันที่ตาม locale
  const fmtDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale || navigator.language, {
        timeZone: tz,
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    [tz, locale]
  );

  // เวลาแบบ 24 ชั่วโมงแน่นอน hh:mm:ss
  const fmtTime = useMemo(
    () =>
      new Intl.DateTimeFormat(locale || navigator.language, {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false, // ✅ บังคับ 24-ชั่วโมง
      }),
    [tz, locale]
  );

  return (
    <footer className={`fixed bottom-0 left-0 right-0 bg-sky-600 text-white ${className}`}>
      <div className="mx-auto w-full px-4 py-2 flex items-center justify-between text-sm">
        <span>Copy Right 2025 Siam Infinity Solution.co.th</span>
        <span>
          {fmtDate.format(now)} • {fmtTime.format(now)}
        </span>
      </div>
    </footer>
  );
}
