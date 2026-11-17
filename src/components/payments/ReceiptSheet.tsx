"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, LifeBuoy, Users } from "lucide-react";
import { Sheet } from "@/components/shared/Sheet";
import { useDocumentDownload } from "@/components/shared/useDocumentDownload";
import { fmtRon } from "@/lib/disputes";
import { fmtDateTime } from "@/lib/format";
import type { PaymentRecord } from "@/types/pago";
import { PaymentStatusTag, PaymentTimeline } from "./PaymentStatus";
import { SplitSheet } from "./SplitSheet";

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`text-right font-semibold text-ink ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

export function ReceiptSheet({ record, onClose }: { record: PaymentRecord; onClose: () => void }) {
  const [splitOpen, setSplitOpen] = useState(false);
  const documents = useDocumentDownload();

  return (
    <>
      <Sheet open onClose={onClose} title="Chitanța plății">
        <div className="flex items-center justify-between gap-3">
          <PaymentStatusTag status={record.status} />
          {record.auto && <span className="text-xs font-semibold text-muted">Plată automată</span>}
        </div>
        <p className="mt-3 text-3xl font-extrabold tracking-tight text-ink">{fmtRon(record.amount)}</p>
        <p className="text-sm text-muted">{record.title}</p>

        <dl className="mt-5 flex flex-col gap-2.5 text-sm">
          <Row label="Data" value={fmtDateTime(record.createdAt)} />
          <Row label="Metodă" value={record.methodLabel} />
          {!record.external && <Row label="Pe extrasul bancar" value={record.payee} mono />}
          <Row label="Comision" value={fmtRon(record.fee)} />
          {record.discount > 0 && <Row label="Reducere din puncte" value={`−${fmtRon(record.discount)}`} />}
          {record.pointsEarned > 0 && <Row label="Puncte câștigate" value={`+${record.pointsEarned}`} />}
          <Row label="Referință" value={record.reference} mono />
        </dl>

        <div className="mt-5 rounded-2xl bg-surface-2 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Parcursul plății</p>
          <PaymentTimeline record={record} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={() => void documents.receipt(record)} disabled={documents.busy} className="btn-soft text-sm disabled:opacity-60">
            <Download size={16} /> {documents.busy ? "Se generează…" : "Descarcă PDF"}
          </button>
          <button onClick={() => setSplitOpen(true)} className="btn-soft text-sm">
            <Users size={16} /> Împarte
          </button>
        </div>
        <Link href="/ajutor" onClick={onClose} className="mt-3 flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-pago-blue">
          <LifeBuoy size={16} /> Am o problemă cu această plată
        </Link>
        <p className="mt-2 text-center text-xs text-muted">Chitanță demonstrativă. Plata nu este procesată real în acest prototip.</p>
      </Sheet>
      <SplitSheet open={splitOpen} onClose={() => setSplitOpen(false)} defaultTitle={record.title} defaultTotal={record.amount} />
    </>
  );
}
