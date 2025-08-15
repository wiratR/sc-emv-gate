// src/components/SummaryCard.tsx

import { summaryToneClass, type EffectiveStatus } from "@/utils/status";

type Props = {
  label: string;
  value: number | string;
  tone?: EffectiveStatus;       // ← รองรับ "stale"
  className?: string;
  loading?: boolean;
  onClick?: () => void;
};

export default function SummaryCard({
  label,
  value,
  tone,
  className = "",
  loading = false,
  onClick,
}: Props) {
  const interactive = typeof onClick === "function";
  return (
    <div
      role={interactive ? "button" : undefined}
      onClick={onClick}
      className={`rounded-2xl border p-4 ${summaryToneClass(tone)} ${interactive ? "cursor-pointer hover:shadow" : ""} ${className}`}
      aria-busy={loading || undefined}
    >
      <div className="text-xs uppercase tracking-wide text-current/70">
        {label}
      </div>

      {loading ? (
        <div className="mt-1 h-7 w-16 rounded bg-current/10 animate-pulse" />
      ) : (
        <div className="text-2xl font-semibold" aria-live="polite">
          {value}
        </div>
      )}
    </div>
  );
}
