"use client";

import { X } from "lucide-react";
import type { PaymentRecord } from "@/types/pago";
import { fmtRon } from "@/lib/disputes";
import { PaymentStatusTag } from "./PaymentStatus";

export function ReceiptSheet({ record, onClose }: { record: PaymentRecord; onClose: () => void }) {
  const when = new Date(record.createdAt).toLocaleString("ro-RO", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div className="w-full max-w-[360px] rounded-card bg-surface p-5 shadow-float" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-lg font-extrabold text-ink">Chitanța plății</p>
          <button onClick={onClose} aria-label="Închide" className="grid size-9 place-items-center rounded-full bg-surface-2 text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">
          <PaymentStatusTag status={record.status} />
        </div>
        <p className="mt-4 text-3xl font-extrabold tracking-tight text-ink">{fmtRon(record.amount)}</p>
        <dl className="mt-4 flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Furnizor</dt>
            <dd className="text-right font-semibold text-ink">{record.supplier}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Data</dt>
            <dd className="text-right font-semibold text-ink">{when}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Referință</dt>
            <dd className="font-mono font-semibold text-ink">{record.reference}</dd>
          </div>
        </dl>
        <p className="mt-5 text-xs text-muted">Chitanță demonstrativă. Plata nu este procesată real în acest prototip.</p>
      </div>
    </div>
  );
}
