// src/components/Modal.tsx

import { createPortal } from "react-dom";
import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

export default function Modal({ open, onClose, title, children, footer, size="md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const width = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";

  const node = (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* dialog */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className={`w-full ${width} rounded-2xl bg-white shadow-xl border`}>
          {title && (
            <div className="px-5 py-3 border-b font-semibold">{title}</div>
          )}
          <div className="p-5">{children}</div>
          {footer && <div className="px-5 py-3 border-t flex justify-end gap-2">{footer}</div>}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
