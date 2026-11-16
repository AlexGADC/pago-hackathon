"use client";

import { useState } from "react";
import { CheckCircle2, Hourglass } from "lucide-react";
import { Card, Tag } from "@/components/shared/Card";
import { useFamily } from "@/context/FamilyContext";
import { disputeRequest, fmtNum, fmtRon, legalDeadlineDays, legalDeadlineLabel, validateIndex } from "@/lib/disputes";
import { demoNow, uniqueId } from "@/lib/format";
import type { Bill, DisputeTicket } from "@/types/pago";

const CONFIDENCE = "Declarat manual de client (supus regularizării)" as const;

export function DisputeFlowA({ bill, onSent }: { bill: Bill; onSent: (ticket: DisputeTicket) => void }) {
  const { submitDispute } = useFamily();
  const [indexText, setIndexText] = useState("");

  if (!bill.meter) return null;

  const meter = bill.meter;
  const realIndex = Number(indexText.replace(",", "."));
  const validation = indexText.trim() === "" ? null : validateIndex(bill, realIndex);

  function confirm() {
    if (!validation?.ok) return;
    const ticket: DisputeTicket = {
      id: uniqueId(`tkt-${bill.id}`),
      billId: bill.id,
      houseId: bill.houseId,
      createdAt: demoNow(),
      stage: "trimisa",
      legalDeadlineDays: legalDeadlineDays(bill),
      confidence: CONFIDENCE,
      realIndex,
      disputedAmount: validation.disputedAmount,
      paidAmount: validation.correctAmount,
      message:
        `Către ${bill.provider}: contest factura ${bill.invoiceNumber} (cod client ${bill.clientCode}). ` +
        `Indexul facturat ${fmtNum(meter.billedIndex)} ${meter.unit} este estimat greșit; indexul real este ${fmtNum(realIndex)} ${meter.unit} ` +
        `(${CONFIDENCE}). ${disputeRequest(validation.correctAmount, validation.disputedAmount)}`,
    };
    submitDispute(ticket);
    onSent(ticket);
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-ink">Care e indexul real?</h2>
      <p className="mt-1 text-sm text-muted">
        Ultimul index confirmat:{" "}
        <b className="text-ink">
          {fmtNum(meter.lastConfirmedIndex)} {meter.unit}
        </b>{" "}
        · Facturat:{" "}
        <b className="text-alert">
          {fmtNum(meter.billedIndex)} {meter.unit}
        </b>
      </p>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-ink">Indexul de pe contorul tău</span>
        <div className="mt-2 flex items-center rounded-2xl border border-line bg-surface px-4 focus-within:border-pago-blue">
          <input
            inputMode="decimal"
            value={indexText}
            onChange={(e) => setIndexText(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder={`ex: ${fmtNum(meter.lastConfirmedIndex + 10)}`}
            className="h-14 min-w-0 flex-1 bg-transparent text-2xl font-bold text-ink outline-none"
          />
          <span className="font-semibold text-muted">{meter.unit}</span>
        </div>
        <span className="mt-2 block text-xs text-muted">Scrie cifrele afișate pe contor, inclusiv zecimalele.</span>
        {validation && !validation.ok && <span className="mt-2 block text-sm font-semibold text-alert">{validation.error}</span>}
      </label>

      {validation?.ok && (
        <div className="mt-5 rounded-2xl bg-surface-2 p-4">
          <Tag tone="orange">{CONFIDENCE}</Tag>
          <p className="mt-3 text-sm text-muted">
            Consum real:{" "}
            <b className="text-ink">
              {fmtNum(validation.consumption)} {meter.unit}
            </b>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface p-3 shadow-card">
              <p className="text-xs text-muted">Plătești acum</p>
              <p className="text-2xl font-extrabold text-success">{fmtRon(validation.correctAmount)}</p>
            </div>
            <div className="rounded-2xl bg-surface p-3 shadow-card">
              <p className="flex items-center gap-1 text-xs text-muted">
                <Hourglass size={12} className="shrink-0" /> Ceri suspendarea pentru
              </p>
              <p className="text-2xl font-extrabold text-ink">{fmtRon(validation.disputedAmount)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            Îi ceri furnizorului să suspende plata diferenței până la soluționarea sesizării. {bill.provider} are la dispoziție {legalDeadlineLabel(bill)} ca să răspundă.
          </p>
          <button onClick={confirm} className="btn-dark mt-4 w-full">
            <CheckCircle2 size={18} /> Trimite sesizarea și plătește {fmtRon(validation.correctAmount)}
          </button>
        </div>
      )}
    </Card>
  );
}
