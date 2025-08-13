// src/components/Dialog.tsx

import { ReactNode, useEffect } from "react";

type Size = "sm" | "md" | "lg";

type Props = {
  open: boolean;
  onClose?: () => void;      // ⬅️ เปลี่ยนเป็น optional
  title?: ReactNode;         // รองรับ JSX
  footer?: ReactNode;
  size?: Size;
  children?: ReactNode;
  closeOnOverlay?: boolean;
};

const sizeClass: Record<Size, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-3xl",
};

export default function Dialog({
  open,
  onClose,
  title,
  footer,
  size = "sm",
  children,
  closeOnOverlay = true,
}: Props) {
  // Esc เพื่อปิด เฉพาะเมื่อมี onClose ให้ใช้งาน
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!closeOnOverlay || !onClose) return;
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-3"
      onMouseDown={handleOverlay}
      aria-modal="true"
      role="dialog"
    >
      <div className={`w-full ${sizeClass[size]} bg-white rounded-2xl shadow-lg overflow-hidden`}>
        {/* Header: แสดงเมื่อมี title หรือมีปุ่มปิดให้กด */}
        {(title || onClose) && (
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold flex items-center gap-2">{title}</div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
              >
                Close
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-3">{children}</div>

        {/* Footer */}
        {footer && <div className="px-4 py-3 border-t flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
