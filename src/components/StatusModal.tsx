// src/components/StatusModal.tsx

import Dialog from "@/components/Dialog";
import { ReactNode } from "react";

type Variant = "info" | "success" | "error" | "confirm";

type Props = {
  open: boolean;
  variant?: Variant;
  title?: ReactNode;
  message?: ReactNode;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  size?: "sm" | "md" | "lg";
};

const tone = {
  info:    { bg: "bg-blue-50",     ring: "ring-blue-200",     text: "text-blue-900",     btn: "bg-blue-600 hover:bg-blue-700 text-white" },
  success: { bg: "bg-emerald-50",  ring: "ring-emerald-200",  text: "text-emerald-900",  btn: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  error:   { bg: "bg-rose-50",     ring: "ring-rose-200",     text: "text-rose-900",     btn: "bg-rose-600 hover:bg-rose-700 text-white" },
  confirm: { bg: "bg-amber-50",    ring: "ring-amber-200",    text: "text-amber-900",    btn: "bg-amber-600 hover:bg-amber-700 text-white" },
} as const;

export default function StatusModal({
  open,
  variant = "info",
  title,
  message,
  onClose,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  size = "sm",
}: Props) {
  const v = tone[variant];

  const footer = onConfirm ? (
    <>
      <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-gray-50">
        {cancelText}
      </button>
      <button type="button" onClick={onConfirm} className={`px-4 py-2 rounded-lg ${v.btn}`}>
        {confirmText}
      </button>
    </>
  ) : (
    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-gray-50">
      OK
    </button>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size={size}
      title={<div className={`font-semibold ${v.text}`}>{title}</div>}
      footer={footer}
    >
      <div className={`rounded-lg p-3 ring-1 ${v.bg} ${v.ring} ${v.text}`}>
        {typeof message === "string" ? <p className="text-sm leading-relaxed">{message}</p> : message}
      </div>
    </Dialog>
  );
}
