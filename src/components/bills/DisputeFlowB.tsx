"use client";

// Flux B — servicii fără contor (salubritate, telecom). Zero poze, zero tastat:
// AI-ul arată linia greșită din PDF, utilizatorul confirmă cu un tap → plată parțială + sesizare.

import { CheckCircle2, FileText, Snowflake } from "lucide-react";
import { Card, Tag } from "@/components/shared/Card";
import { useFamily } from "@/context/FamilyContext";
import { POINTS } from "@/data/mockFamilyData";
import { fmtRon, legalDeadlineDays } from "@/lib/disputes";
import type { Bill, DisputeTicket } from "@/types/pago";

const CONFIDENCE = "Confirmat de client (fără contor)" as const;

/** `onSent` e apelat după trimitere: factura iese din „red_flag”, deci părintele afișează confirmarea. */
export function DisputeFlowB({ bill, onSent }: { bill: Bill; onSent: (ticket: DisputeTicket) => void }) {
  const { submitDispute, addPoints } = useFamily();
  const anomaly = bill.anomaly!;
  const correctAmount = anomaly.expectedAmount;
  const disputedAmount = bill.amount - correctAmount;
  const suspicious = anomaly.suspiciousLines ?? [];

  // Liniile „din PDF”: cele suspecte (marcate de AI) între câteva linii obișnuite ale facturii.
  const pdfLines: { text: string; flagged: boolean }[] = [
    { text: `Factura ${bill.invoiceNumber} · Cod client ${bill.clientCode}`, flagged: false },
    { text: `Emisă la ${new Date(bill.issueDate).toLocaleDateString("ro-RO")}`, flagged: false },
    ...suspicious.map((text) => ({ text, flagged: true })),
    { text: `Total de plată: ${fmtRon(bill.amount)}`, flagged: false },
  ];

  function confirm() {
    const ticket: DisputeTicket = {
      id: `tkt-${bill.id}-${Date.now()}`,
      billId: bill.id,
      houseId: bill.houseId,
      createdAt: new Date().toISOString(),
      stage: "trimisa",
      legalDeadlineDays: legalDeadlineDays(bill),
      confidence: CONFIDENCE,
      disputedAmount,
      paidAmount: correctAmount,
      message:
        `Către ${bill.provider}: contest factura ${bill.invoiceNumber} (cod client ${bill.clientCode}). ` +
        `Pe factură apare „${suspicious[0] ?? "o linie greșită"}”, ceea ce nu corespunde situației reale. ` +
        `Am achitat suma corectă de ${fmtRon(correctAmount)} și solicit emiterea facturii storno pentru diferența de ${fmtRon(disputedAmount)}.`,
    };
    submitDispute(ticket);
    addPoints(POINTS.bounty);
    onSent(ticket);
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-ink">Am găsit greșeala în factură</h2>
      <p className="mt-1 text-sm text-muted">Nu ai nevoie de poză sau contor. Uită-te doar la linia marcată.</p>

      {/* Fragment din PDF cu linia greșită evidențiată */}
      <div className="mt-4 rounded-2xl border border-line bg-app p-4">
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

      {/* Rezumat: cât plătești acum și cât se îngheață */}
      <div className="mt-4 rounded-2xl bg-app p-4">
        <Tag tone="blue">✨ Detectat de Pago AI în PDF</Tag>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-3 shadow-card">
            <p className="text-xs text-muted">Plătești acum</p>
            <p className="text-2xl font-extrabold text-success">{fmtRon(correctAmount)}</p>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-card">
            <p className="flex items-center gap-1 text-xs text-muted">
              <Snowflake size={12} /> Înghețat
            </p>
            <p className="text-2xl font-extrabold text-ink">{fmtRon(disputedAmount)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Diferența rămâne înghețată până când {bill.provider} emite factura storno (răspuns legal în max. {legalDeadlineDays(bill)} zile).
        </p>
        <button onClick={confirm} className="btn-dark mt-4 w-full">
          <CheckCircle2 size={18} /> Da, e greșit · Plătește {fmtRon(correctAmount)}
        </button>
      </div>
    </Card>
  );
}
