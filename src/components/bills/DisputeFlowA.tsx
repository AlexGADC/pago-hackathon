"use client";

import { useState } from "react";
import { CheckCircle2, Snowflake } from "lucide-react";
import { Card, Tag } from "@/components/shared/Card";
import { useFamily } from "@/context/FamilyContext";
import { POINTS } from "@/data/mockFamilyData";
import { fmtNum, fmtRon, legalDeadlineDays, validateIndex } from "@/lib/disputes";
import type { Bill, DisputeTicket } from "@/types/pago";

const CONFIDENCE = "Declarat manual de client (supus regularizării)" as const;

export function DisputeFlowA({ bill, onSent }: { bill: Bill; onSent: (ticket: DisputeTicket) => void }) {
  const { submitDispute, addPoints } = useFamily();
  const meter = bill.meter!;
  const [indexText, setIndexText] = useState("");

  const realIndex = Number(indexText.replace(",", "."));
  const validation = indexText.trim() === "" ? null : validateIndex(bill, realIndex);

  function confirm() {
    if (!validation?.ok) return;
    const ticket: DisputeTicket = {
      id: `tkt-${bill.id}-${Date.now()}`,
      billId: bill.id,
      houseId: bill.houseId,
      createdAt: new Date().toISOString(),
      stage: "trimisa",
      legalDeadlineDays: legalDeadlineDays(bill),
      confidence: CONFIDENCE,
      realIndex,
      disputedAmount: validation.disputedAmount,
      paidAmount: validation.correctAmount,
      message:
        `Către ${bill.provider}: contest factura ${bill.invoiceNumber} (cod client ${bill.clientCode}). ` +
        `Indexul facturat ${fmtNum(meter.billedIndex)} ${meter.unit} este estimat greșit; indexul real este ${realIndex} ${meter.unit} ` +
        `(${CONFIDENCE}). Am achitat suma necontestată de ${fmtRon(validation.correctAmount)} și solicit emiterea facturii storno ` +
        `pentru diferența de ${fmtRon(validation.disputedAmount)}.`,
    };
    submitDispute(ticket);
    addPoints(POINTS.bounty);
    onSent(ticket);
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-ink">Care e indexul real?</h2>
      <p className="mt-1 text-sm text-muted">
        Ultimul index confirmat: <b className="text-ink">{fmtNum(meter.lastConfirmedIndex)} {meter.unit}</b> · Facturat:{" "}
        <b className="text-alert">{fmtNum(meter.billedIndex)} {meter.unit}</b>
      </p>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-ink">Indexul de pe contorul tău</span>
        <div className="mt-2 flex items-center rounded-2xl border border-line bg-white px-4 focus-within:border-pago-blue">
          <input
            inputMode="decimal"
            value={indexText}
            onChange={(e) => setIndexText(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder={`ex: ${fmtNum(meter.lastConfirmedIndex + 260)}`}
            className="h-14 min-w-0 flex-1 bg-transparent text-2xl font-bold text-ink outline-none"
          />
          <span className="font-semibold text-muted">{meter.unit}</span>
        </div>
        <span className="mt-2 block text-xs text-muted">Scrie cifrele afișate pe contor, inclusiv zecimalele.</span>
        {validation && !validation.ok && <span className="mt-2 block text-sm font-semibold text-alert">{validation.error}</span>}
      </label>

      {validation?.ok && (
        <div className="mt-5 rounded-2xl bg-app p-4">
          <Tag tone="orange">{CONFIDENCE}</Tag>
          <p className="mt-3 text-sm text-muted">
            Consum real: <b className="text-ink">{fmtNum(validation.consumption)} {meter.unit}</b>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-card">
              <p className="text-xs text-muted">Plătești acum</p>
              <p className="text-2xl font-extrabold text-success">{fmtRon(validation.correctAmount)}</p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-card">
              <p className="flex items-center gap-1 text-xs text-muted">
                <Snowflake size={12} /> Înghețat
              </p>
              <p className="text-2xl font-extrabold text-ink">{fmtRon(validation.disputedAmount)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">Diferența rămâne înghețată până când {bill.provider} emite factura storno.</p>
          <button onClick={confirm} className="btn-dark mt-4 w-full">
            <CheckCircle2 size={18} /> Trimite sesizarea și plătește {fmtRon(validation.correctAmount)}
          </button>
        </div>
      )}
    </Card>
  );
}
