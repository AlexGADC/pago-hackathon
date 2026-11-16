"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-rise flex max-h-[92dvh] w-full max-w-[430px] flex-col rounded-t-[28px] bg-surface shadow-float sm:max-h-[min(820px,calc(100dvh_-_3rem))] sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
          <h2 className="min-w-0 truncate text-lg font-extrabold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Închide" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-line px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
