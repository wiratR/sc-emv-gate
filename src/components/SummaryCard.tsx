// src/components/SummaryCard.tsx

import { DeviceStatus, summaryToneClass } from "@/utils/status";

type Props = {
  label: string;
  value: number | string;
  tone?: DeviceStatus;
  className?: string;
};

export default function SummaryCard({ label, value, tone, className = "" }: Props) {
  return (
    <div className={`rounded-2xl border p-4 ${summaryToneClass(tone)} ${className}`}>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}