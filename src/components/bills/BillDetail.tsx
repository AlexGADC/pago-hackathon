"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, FileQuestionMark, FileText, RefreshCw, Users } from "lucide-react";
import { AutopayCard } from "@/components/payments/AutopayCard";
import { ConnectionBadge, PaymentStatusTag } from "@/components/payments/PaymentStatus";
import { ReceiptSheet } from "@/components/payments/ReceiptSheet";
import { SplitSheet } from "@/components/payments/SplitSheet";
import { Card, Tag } from "@/components/shared/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { useFamily } from "@/context/FamilyContext";
import { UTILITY_LABEL } from "@/data/catalog";
import { daysUntil, fmtRon, percentOverAverage } from "@/lib/disputes";
import { MONTHS, daysLabel, fmtDate, fmtDay } from "@/lib/format";
import { findMissingBill } from "@/lib/notifications";
import { billEventId, buildEvents, eventState, isOverdue, toCheckoutItem } from "@/lib/payments";
import type { Bill, DisputeTicket } from "@/types/pago";
import { BILL_STATUS } from "./billStatus";
import { DisputeFlowA } from "./DisputeFlowA";
import { DisputeFlowB } from "./DisputeFlowB";
import { DisputeSentCard } from "./DisputeSentCard";
import { SelfReadingCard } from "./SelfReadingCard";
import { TicketTracker } from "./TicketTracker";

export function BillDetail({ billId }: { billId: string }) {
  const { bills, tickets, connections, ledger, today, openCheckout, reconnect, payExternally, toast } = useFamily();
  const bill = bills.find((b) => b.id === billId);
  const [justSent, setJustSent] = useState<DisputeTicket | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);

  if (!bill) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Factură" back="/facturi" />
        <Card>Nu am găsit factura. Verifică în Furnizori dacă mai este conectat contul.</Card>
      </div>
    );
  }

  const status = BILL_STATUS[bill.status];
  const ticket = tickets.find((t) => t.billId === bill.id);
  const connection = connections.find((c) => c.provider === bill.provider && c.houseId === bill.houseId);
  const event = buildEvents(ledger, bill.houseId, Number(bill.dueDate.slice(0, 4)), today).find((e) => e.id === billEventId(bill));
  const state = event ? eventState(event) : "paid";
  const late = event ? isOverdue(event, today) : false;
  const record = event?.record;
  const monthLabel = MONTHS[Number(bill.dueDate.slice(5, 7)) - 1].toLowerCase();
  const storno = ticket?.stage === "stornata" ? ticket : undefined;
  const missing = findMissingBill(bill, connections, today);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={bill.provider} subtitle={UTILITY_LABEL[bill.kind]} back="/facturi" />

      <Card>
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag tone={status.tone}>{status.label}</Tag>
          {late && <Tag tone="red">Întârziată</Tag>}
        </div>
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
        {storno && (
          <p className="mt-2 text-sm font-semibold text-success">
            Corectată prin factura storno. Inițial: {fmtRon(storno.paidAmount + storno.disputedAmount)}.
          </p>
        )}
        <HistoryBars bill={bill} />
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <FileText size={14} className="shrink-0" /> Factura {bill.invoiceNumber} · Cod client {bill.clientCode}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Emisă</dt>
            <dd className="font-semibold text-ink">{fmtDate(bill.issueDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Scadentă</dt>
            <dd className={`font-semibold ${late ? "text-alert" : "text-ink"}`}>{fmtDate(bill.dueDate)}</dd>
          </div>
        </dl>
      </Card>

      {connection && connection.status !== "conectat" && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-ink">Conexiunea cu {bill.provider}</p>
            <ConnectionBadge status={connection.status} />
          </div>
          {connection.problem && <p className="mt-2 text-sm text-alert">{connection.problem}</p>}
          <p className="mt-2 text-xs text-muted">Istoricul de facturi este păstrat, chiar dacă conexiunea e întreruptă.</p>
          {connection.status === "deconectat" && (
            <button onClick={() => reconnect(bill.provider, bill.houseId)} className="btn-dark mt-4 w-full text-sm">
              <RefreshCw size={16} /> Reconectează contul
            </button>
          )}
        </Card>
      )}

      {missing && (
        <Card>
          <p className="flex items-center gap-2 text-sm font-bold text-warning">
            <FileQuestionMark size={16} className="shrink-0" /> Factura lunii {missing.label} nu a sosit încă
          </p>
          <p className="mt-2 text-sm text-muted">
            {bill.provider} o trimite de obicei în jurul datei de {missing.usualDay}. Verifică legătura cu furnizorul, ca să nu ratezi scadența.
          </p>
          <Link href="/facturi/furnizori" className="btn-soft mt-4 w-full text-sm">
            Vezi furnizorii
          </Link>
        </Card>
      )}

      {bill.anomaly && bill.status === "red_flag" && (
        <Card>
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-pago-blue">
            <AlertTriangle size={16} /> Ce am găsit în factură
          </p>
          <p className="text-[15px] leading-relaxed text-ink">{bill.anomaly.reason}</p>
        </Card>
      )}

      {event && state !== "flagged" && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-ink">Plată</p>
            {record ? <PaymentStatusTag status={record.status} /> : state === "paid" ? <Tag tone="green">Plătită</Tag> : null}
          </div>

          {state === "paid" && (
            <>
              <p className="mt-2 text-sm text-ink">
                {record?.external ? "Ai marcat factura ca plătită în afara aplicației." : `Plata de ${fmtRon(event.amount)} a ajuns la ${bill.provider}.`}
                {event.frozen > 0 ? ` Pentru diferența de ${fmtRon(event.frozen)} ai cerut suspendarea plății până la soluționarea sesizării.` : ""}
                {storno ? ` Diferența de ${fmtRon(storno.disputedAmount)} a fost anulată prin factura storno.` : ""}
              </p>
              {record && (
                <button onClick={() => setReceiptOpen(true)} className="btn-soft mt-4 w-full text-sm">
                  Vezi chitanța
                </button>
              )}
            </>
          )}

          {state === "pending" && <p className="mt-2 text-sm text-muted">Plata de {fmtRon(event.amount)} este în drum spre {bill.provider}. Te anunțăm când furnizorul o confirmă.</p>}

          {state === "failed" && (
            <>
              <p className="mt-2 text-sm text-alert">{record?.failureReason ?? "Plata nu a ajuns la furnizor. Banii nu au plecat din cont."}</p>
              <button onClick={() => openCheckout([toCheckoutItem(event)])} className="btn-dark mt-4 w-full text-sm">
                Încearcă din nou
              </button>
            </>
          )}

          {state === "auto" && (
            <>
              <p className="mt-2 text-sm text-muted">
                {fmtRon(event.amount)} se plătesc automat pe {fmtDay(event.date)}. Nu trebuie să faci nimic.
              </p>
              <button onClick={() => openCheckout([toCheckoutItem(event)])} className="btn-soft mt-4 w-full text-sm">
                Plătește acum
              </button>
            </>
          )}

          {(state === "due" || state === "blocked") && (
            <>
              <p className={`mt-2 text-sm ${late ? "font-semibold text-alert" : "text-muted"}`}>
                {late
                  ? `Scadența a trecut de ${daysLabel(daysUntil(today, bill.dueDate))}. Plătește acum ca să eviți penalizările.`
                  : event.frozen > 0
                    ? `Mai ai de plătit suma necontestată. Pentru ${fmtRon(event.frozen)} ai cerut suspendarea plății până la soluționarea sesizării.`
                    : storno
                      ? `${bill.provider} a corectat factura. Plătești doar suma corectă, fără comision.`
                      : "Factura e în regulă. Plătești direct din aplicație, fără comision."}
              </p>
              <button onClick={() => openCheckout([toCheckoutItem(event)])} className="btn-dark mt-4 w-full">
                Plătește {fmtRon(event.amount)}
              </button>
              <button
                onClick={() => {
                  payExternally(toCheckoutItem(event));
                  toast("Am notat plata. O găsești în Istoric.");
                }}
                className="mt-2 min-h-11 w-full text-sm font-semibold text-pago-blue"
              >
                Am plătit deja în altă parte
              </button>
            </>
          )}
        </Card>
      )}

      {bill.status === "red_flag" && bill.flow === "A" && <DisputeFlowA bill={bill} onSent={setJustSent} />}
      {bill.status === "red_flag" && bill.flow === "B" && <DisputeFlowB bill={bill} onSent={setJustSent} />}

      {event && state === "flagged" && (
        <button onClick={() => openCheckout([toCheckoutItem(event)], "Plătește întreaga sumă")} className="min-h-11 text-sm font-semibold text-muted underline">
          Factura e corectă? Plătește întreaga sumă de {fmtRon(event.amount)}
        </button>
      )}

      {justSent && <DisputeSentCard ticket={ticket ?? justSent} bill={bill} />}
      {ticket && <TicketTracker ticket={ticket} bill={bill} />}

      <SelfReadingCard bill={bill} />

      <AutopayCard targetId={bill.id} targetKind="bill" houseId={bill.houseId} name={bill.provider} typicalAmount={bill.averageAmount} />

      <button onClick={() => setSplitOpen(true)} className="btn-soft w-full text-sm">
        <Users size={16} /> Împarte factura cu familia
      </button>

      {receiptOpen && record && <ReceiptSheet record={record} onClose={() => setReceiptOpen(false)} />}
      <SplitSheet open={splitOpen} onClose={() => setSplitOpen(false)} defaultTitle={`${bill.provider} · ${monthLabel}`} defaultTotal={event?.amount ?? bill.amount} />
    </div>
  );
}

function HistoryBars({ bill }: { bill: Bill }) {
  const values = [...bill.history.map((h) => h.amount), bill.amount];
  const max = Math.max(...values);
  return (
    <div className="mt-4 flex h-16 items-end gap-1" role="img" aria-label="Istoricul facturilor pe ultimele 12 luni și luna curentă">
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
