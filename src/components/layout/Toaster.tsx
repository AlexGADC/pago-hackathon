"use client";

import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useFamily, type ToastTone } from "@/context/FamilyContext";

const TONE: Record<ToastTone, { cls: string; Icon: typeof Info }> = {
  success: { cls: "bg-ink text-white", Icon: CheckCircle2 },
  info: { cls: "bg-ink text-white", Icon: Info },
  alert: { cls: "bg-alert text-white", Icon: AlertCircle },
};

export function Toaster() {
  const { toasts } = useFamily();
  if (toasts.length === 0 || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-[max(6.5rem,calc((100dvh_-_880px)_/_2_+_5.5rem))]"
    >
      {toasts.map((t) => {
        const { cls, Icon } = TONE[t.tone];
        return (
          <div key={t.id} className={`animate-rise flex max-w-[380px] items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-float ${cls}`}>
            <Icon size={16} className="shrink-0" />
            <span className="truncate">{t.text}</span>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
