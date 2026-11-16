"use client";

import { CheckCircle2, FileText, Hourglass } from "lucide-react";
import { Card, Tag } from "@/components/shared/Card";
import { useFamily } from "@/context/FamilyContext";
import { disputeRequest, fmtRon, legalDeadlineDays, legalDeadlineLabel } from "@/lib/disputes";
import { demoNow, fmtDate, uniqueId } from "@/lib/format";
import type { Bill, DisputeTicket } from "@/types/pago";

const CONFIDENCE = "Confirmat de client (fără contor)" as const;

export function DisputeFlowB({ bill, onSent }: { bill: Bill; onSent: (ticket: DisputeTicket) => void }) {
  const { submitDispute } = useFamily();

  if (!bill.anomaly) return null;

  const correctAmount = bill.anomaly.expectedAmount;
  const disputedAmount = bill.amount - correctAmount;
  const suspicious = bill.anomaly.suspiciousLines ?? [];

  const pdfLines: { text: string; flagged: boolean }[] = [
    { text: `Factura ${bill.invoiceNumber} · Cod client ${bill.clientCode}`, flagged: false },
    { text: `Emisă la ${fmtDate(bill.issueDate)}`, flagged: false },
    ...suspicious.map((text) => ({ text, flagged: true })),
    { text: `Total de plată: ${fmtRon(bill.amount)}`, flagged: false },
  ];

  function confirm() {
    const ticket: DisputeTicket = {
      id: uniqueId(`tkt-${bill.id}`),
      billId: bill.id,
      houseId: bill.houseId,
      createdAt: demoNow(),
      stage: "trimisa",
      legalDeadlineDays: legalDeadlineDays(bill),
      confidence: CONFIDENCE,
      disputedAmount,
      paidAmount: correctAmount,
      message:
        `Către ${bill.provider}: contest factura ${bill.invoiceNumber} (cod client ${bill.clientCode}). ` +
        `Pe factură apare „${suspicious[0] ?? "o linie greșită"}”, ceea ce nu corespunde situației reale. ` +
        disputeRequest(correctAmount, disputedAmount),
    };
    submitDispute(ticket);
    onSent(ticket);
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-ink">Am găsit greșeala în factură</h2>
      <p className="mt-1 text-sm text-muted">Uită-te doar la linia marcată.</p>

      <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted">
          <FileText size={14} /> Din PDF-ul facturii {bill.provider}
        </p>
        <ul className="flex flex-col gap-1.5">
          {pdfLines.map((line) => (
            <li
              key={line.text}
              className={`rounded-xl px-3 py-2 font-mono text-[13px] ${line.flagged ? "bg-alert-bg font-bold text-alert ring-1 ring-alert/40" : "text-muted"}`}
            >
              {line.flagged && "⚠ "}
              {line.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-2xl bg-surface-2 p-4">
        <Tag tone="blue">✨ Linie suspectă detectată</Tag>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface p-3 shadow-card">
            <p className="text-xs text-muted">Plătești acum</p>
            <p className="text-2xl font-extrabold text-success">{fmtRon(correctAmount)}</p>
          </div>
          <div className="rounded-2xl bg-surface p-3 shadow-card">
            <p className="flex items-center gap-1 text-xs text-muted">
              <Hourglass size={12} className="shrink-0" /> Ceri suspendarea pentru
            </p>
            <p className="text-2xl font-extrabold text-ink">{fmtRon(disputedAmount)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Îi ceri furnizorului să suspende plata diferenței până la soluționarea sesizării. {bill.provider} are la dispoziție {legalDeadlineLabel(bill)} ca să răspundă.
        </p>
        <button onClick={confirm} className="btn-dark mt-4 w-full">
          <CheckCircle2 size={18} /> Da, e greșit · Plătește {fmtRon(correctAmount)}
        </button>
      </div>
    </Card>
  );
}
