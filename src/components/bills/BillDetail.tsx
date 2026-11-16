"use client";

// Ecranul de detaliu al facturii + „Alege fluxul de contestare după tipul facturii.

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, FileText, Snowflake } from "lucide-react";
import { Card, Tag } from "@/components/shared/Card";
import { useFamily } from "@/context/FamilyContext";
import { fmtRon, percentOverAverage } from "@/lib/disputes";
import type { Bill, DisputeTicket } from "@/types/pago";
import { BILL_STATUS } from "./billStatus";
import { DisputeFlowA } from "./DisputeFlowA";
import { DisputeFlowB } from "./DisputeFlowB";
import { DisputeSentCard } from "./DisputeSentCard";

export function BillDetail({ billId }: { billId: string }) {
  const { bills, tickets, payBill } = useFamily();
  const bill = bills.find((b) => b.id === billId);
  const ticket = tickets.find((t) => t.billId === billId);
  const [justSent, setJustSent] = useState<DisputeTicket | null>(null);

  if (!bill) {
    return (
      <div className="pt-6">
        <BackHeader title="Factură" />
        <Card>Nu am găsit factura.</Card>
      </div>
    );
  }

  const status = BILL_STATUS[bill.status];

  return (
    <div className="flex flex-col gap-4 pt-2">
      <BackHeader title={bill.provider} />

      {/* Rezumatul facturii */}
      <Card>
        <Tag tone={status.tone}>{status.label}</Tag>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted">Facturat</p>
            <p className={`text-4xl font-extrabold tracking-tight ${bill.status === "red_flag" ? "text-alert" : "text-ink"}`}>{fmtRon(bill.amount)}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted">Media ta</p>
            <p className="font-bold text-ink">{fmtRon(bill.averageAmount)}</p>
          </div>
        </div>
        {bill.status === "red_flag" && <p className="mt-2 text-sm font-semibold text-alert">+{percentOverAverage(bill)}% față de media ultimelor 12 luni</p>}
        <HistoryBars bill={bill} />
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <FileText size={14} /> Factura {bill.invoiceNumber} · Cod client {bill.clientCode}
        </p>
      </Card>

      {bill.anomaly && (
        <Card>
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-pago-blue">
            <AlertTriangle size={16} /> Ce am găsit în factură
          </p>
          <p className="text-[15px] leading-relaxed text-ink">{bill.anomaly.reason}</p>
        </Card>
      )}

      {bill.status === "normala" && (
        <Card>
          <p className="text-sm text-muted">Factura e în regulă. Poți plăti direct din aplicație.</p>
          <button onClick={() => payBill(bill.id)} className="btn-dark mt-4 w-full">
            Plătește {fmtRon(bill.amount)}
          </button>
        </Card>
      )}

      {/* Fluxul de contestare */}
      {bill.status === "red_flag" && bill.flow === "A" && <DisputeFlowA bill={bill} onSent={setJustSent} />}
      {bill.status === "red_flag" && bill.flow === "B" && <DisputeFlowB bill={bill} onSent={setJustSent} />}

      {justSent && <DisputeSentCard ticket={justSent} provider={bill.provider} />}

      {/* Contestație deja trimisă */}
      {ticket && !justSent && bill.status !== "red_flag" && (
        <Card>
          <Tag tone="indigo">📨 Sesizare trimisă</Tag>
          <p className="mt-3 text-sm text-ink">
            Ai plătit <b>{fmtRon(ticket.paidAmount)}</b>. Diferența de <b>{fmtRon(ticket.disputedAmount)}</b> e înghețată până la factura storno.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <Snowflake size={14} /> {ticket.confidence} · răspuns legal în max. {ticket.legalDeadlineDays} zile
          </p>
        </Card>
      )}
    </div>
  );
}

function BackHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link href="/facturi" aria-label="Înapoi la facturi" className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-ink shadow-card">
        <ArrowLeft size={20} />
      </Link>
      <h1 className="min-w-0 truncate text-xl font-bold text-ink">{title}</h1>
    </div>
  );
}

/** Istoricul pe 12 luni + luna curentă, ca să se vadă „sărirea”. */
function HistoryBars({ bill }: { bill: Bill }) {
  const values = [...bill.history.map((h) => h.amount), bill.amount];
  const max = Math.max(...values);
  return (
    <div className="mt-4 flex h-16 items-end gap-1" aria-label="Istoric pe 12 luni">
      {values.map((v, i) => {
        const current = i === values.length - 1;
        return (
          <div
            key={i}
            className={`flex-1 rounded-full ${current ? (bill.status === "red_flag" ? "bg-alert" : "bg-pago-blue") : "bg-line"}`}
            style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
            title={fmtRon(v)}
          />
        );
      })}
    </div>
  );
}
