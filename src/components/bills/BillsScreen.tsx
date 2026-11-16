"use client";

import Link from "next/link";
import { ChevronRight, Plug, PlugZap, Plus, RefreshCw, Zap } from "lucide-react";
import { ConnectionBadge, PaymentStatusTag } from "@/components/payments/PaymentStatus";
import { Tag } from "@/components/shared/Card";
import { EmptyState } from "@/components/shared/Controls";
import { ScreenTitle } from "@/components/shared/PageHeader";
import { useFamily } from "@/context/FamilyContext";
import { fmtRon, percentOverAverage } from "@/lib/disputes";
import { fmtDate, plural } from "@/lib/format";
import { findMissingBill } from "@/lib/notifications";
import { billEventId, eventState, isOverdue } from "@/lib/payments";
import { BILL_STATUS } from "./billStatus";

const ORDER = { red_flag: 0, contestata: 1, normala: 2, platita_partial: 3, platita: 4 } as const;

export function BillsScreen() {
  const { house, houseBills, houseConnections, yearEvents, today, reconnect } = useFamily();
  const broken = houseConnections.filter((c) => c.status === "deconectat");
  const bills = [...houseBills].sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.dueDate.localeCompare(b.dueDate));
  const open = bills.map((b) => yearEvents.find((e) => e.id === billEventId(b))).filter((e) => e && !e.paid);
  const toPay = open.reduce((sum, e) => sum + (e?.amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <ScreenTitle
        title={`Facturi · ${house.name}`}
        subtitle={bills.length ? `${plural(open.length, "factură de plătit", "facturi de plătit")} · ${fmtRon(toPay)}` : undefined}
        action={
          <Link href="/facturi/furnizori" className="pill shrink-0 bg-surface text-ink shadow-card">
            <Plug size={14} className="text-pago-blue" /> Furnizori
          </Link>
        }
      />

      {broken.length > 0 && (
        <div className="flex flex-col gap-3 rounded-card bg-alert-bg p-4">
          {broken.map((c) => (
            <div key={c.provider} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-alert">{c.provider} e deconectat</p>
                <p className="text-xs text-muted">Istoricul e păstrat. Reconectează ca să vezi facturile noi.</p>
              </div>
              <button onClick={() => reconnect(c.provider, c.houseId)} className="pill pill-primary shrink-0">
                <RefreshCw size={14} /> Reconectează
              </button>
            </div>
          ))}
        </div>
      )}

      {bills.length === 0 ? (
        <EmptyState icon={PlugZap} title="Niciun furnizor conectat" text="Conectează furnizorii o singură dată, iar facturile apar aici automat, cu notificare la emitere și la scadență.">
          <Link href="/facturi/furnizori" className="btn-dark w-full text-sm">
            <Plus size={16} /> Conectează un furnizor
          </Link>
        </EmptyState>
      ) : (
        bills.map((b) => {
          const status = BILL_STATUS[b.status];
          const flagged = b.status === "red_flag";
          const connection = houseConnections.find((c) => c.provider === b.provider);
          const event = yearEvents.find((e) => e.id === billEventId(b));
          const state = event ? eventState(event) : "paid";
          const late = event ? isOverdue(event, today) : false;
          const missing = findMissingBill(b, houseConnections, today);
          return (
            <Link
              key={b.id}
              href={`/facturi/${b.id}`}
              className={`block rounded-card bg-surface p-5 shadow-card transition active:scale-[0.99] ${flagged ? "ring-1 ring-alert/40" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag tone={status.tone}>{status.label}</Tag>
                  {late && <Tag tone="red">Întârziată</Tag>}
                  {state === "auto" && (
                    <Tag tone="green">
                      <Zap size={11} /> Automat
                    </Tag>
                  )}
                </div>
                <ChevronRight size={18} className="shrink-0 text-muted" />
              </div>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">{b.provider}</p>
                  <p className={`text-xs ${late ? "font-semibold text-alert" : "text-muted"}`}>Scadentă {fmtDate(b.dueDate)}</p>
                </div>
                <p className={`shrink-0 text-lg font-extrabold ${flagged ? "text-alert" : "text-ink"}`}>{fmtRon(event?.amount ?? b.amount)}</p>
              </div>
              {(connection || event?.record) && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {connection && <ConnectionBadge status={connection.status} />}
                  {event?.record && <PaymentStatusTag status={event.record.status} />}
                </div>
              )}
              {missing && (
                <p className="mt-2 text-xs font-semibold text-warning">
                  Factura lunii {missing.label} nu a sosit încă · de obicei apare în jurul datei de {missing.usualDay}
                </p>
              )}
              {flagged && (
                <p className="mt-2 text-xs font-semibold text-alert">
                  +{percentOverAverage(b)}% față de media ta ({fmtRon(b.averageAmount)}) · <b className="font-extrabold">Apasă ca să contești</b>
                </p>
              )}
            </Link>
          );
        })
      )}

      {bills.length > 0 && (
        <Link href="/facturi/furnizori" className="flex min-h-14 items-center justify-center gap-2 rounded-card border-2 border-dashed border-line text-sm font-bold text-pago-blue">
          <Plus size={16} /> Adaugă furnizor
        </Link>
      )}
    </div>
  );
}
