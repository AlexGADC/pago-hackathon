"use client";

import { useState } from "react";
import { Download, Search, Zap } from "lucide-react";
import { PaymentStatusTag } from "@/components/payments/PaymentStatus";
import { ReceiptSheet } from "@/components/payments/ReceiptSheet";
import { CategoryBadge } from "@/components/shared/Badges";
import { Card } from "@/components/shared/Card";
import { Chip, Segmented } from "@/components/shared/Controls";
import { PageHeader } from "@/components/shared/PageHeader";
import { useFamily } from "@/context/FamilyContext";
import { cardLabel } from "@/lib/checkout";
import { fmtRon } from "@/lib/disputes";
import { downloadText } from "@/lib/download";
import { MONTHS, fmtDay, plural } from "@/lib/format";
import {
  DEFAULT_HISTORY_FILTERS,
  buildHistory,
  filterHistory,
  groupByMonth,
  historyCsv,
  sumConfirmed,
  type HistoryFilters,
  type HistoryPeriod,
  type HistoryStatusFilter,
} from "@/lib/history";
import { CATEGORIES, CATEGORY_META, buildEvents } from "@/lib/payments";

const PERIODS: { value: HistoryPeriod; label: string }[] = [
  { value: "luna", label: "Luna" },
  { value: "3luni", label: "3 luni" },
  { value: "an", label: "Anul" },
  { value: "tot", label: "Tot" },
];

const STATUSES: { value: HistoryStatusFilter; label: string }[] = [
  { value: "toate", label: "Orice stare" },
  { value: "confirmate", label: "Confirmate" },
  { value: "in_curs", label: "În curs" },
  { value: "esuate", label: "Eșuate" },
];

export function HistoryScreen() {
  const { house, ledger, payments, autopay, defaultMethod, today, toast } = useFamily();
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_HISTORY_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);

  const year = Number(today.slice(0, 4));
  const events = [year - 1, year].flatMap((y) => buildEvents(ledger, house.id, y, today));
  const all = buildHistory(events, payments, {
    houseId: house.id,
    defaultMethodLabel: defaultMethod ? cardLabel(defaultMethod) : "Card",
    autopayTargets: autopay.filter((r) => r.enabled).map((r) => r.targetId),
    today,
  });
  const records = filterHistory(all, filters, today);
  const groups = groupByMonth(records);
  const open = all.find((r) => r.id === openId) ?? null;

  function update(patch: Partial<HistoryFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  function exportCsv() {
    downloadText(`pago-istoric-${today}.csv`, historyCsv(records), "text/csv");
    toast(`Am exportat ${plural(records.length, "plată", "plăți")}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title="Istoric plăți"
        subtitle={house.name}
        back="/"
        action={
          <button onClick={exportCsv} disabled={records.length === 0} aria-label="Exportă în CSV" className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card disabled:opacity-50">
            <Download size={18} />
          </button>
        }
      />

      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4">
        <Search size={18} className="shrink-0 text-muted" />
        <input
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
          placeholder="Caută furnizor sau referință"
          aria-label="Caută în istoric"
          className="h-12 min-w-0 flex-1 bg-transparent font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
        />
      </div>

      <Segmented value={filters.period} onChange={(period) => update({ period })} options={PERIODS} label="Perioadă" />

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={filters.category === "toate"} onClick={() => update({ category: "toate" })}>
          Toate
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={filters.category === c} onClick={() => update({ category: c })}>
            {CATEGORY_META[c].label}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {STATUSES.map((s) => (
          <Chip key={s.value} active={filters.status === s.value} onClick={() => update({ status: s.value })}>
            {s.label}
          </Chip>
        ))}
      </div>

      <Card>
        <p className="text-sm font-medium text-muted">Total plătit în perioada aleasă</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{fmtRon(sumConfirmed(records))}</p>
        <p className="mt-1 text-sm text-muted">{plural(records.length, "plată", "plăți")} · comision total 0 RON</p>
      </Card>

      {groups.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nicio plată pentru filtrele alese. Schimbă perioada sau șterge căutarea.</p>
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.month}>
            <div className="mb-2 mt-2 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
                {MONTHS[Number(group.month.slice(5, 7)) - 1]} {group.month.slice(0, 4)}
              </h2>
              <span className="text-xs font-semibold text-muted">{fmtRon(sumConfirmed(group.records))}</span>
            </div>
            <Card className="flex flex-col divide-y divide-line">
              {group.records.map((r) => (
                <button key={r.id} onClick={() => setOpenId(r.id)} className="flex min-h-14 items-center gap-3 py-2.5 text-left first:pt-0 last:pb-0">
                  <CategoryBadge category={r.category} filled={r.status === "confirmata"} size="lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{r.title}</span>
                    <span className="flex items-center gap-1 truncate text-xs text-muted">
                      {fmtDay(r.createdAt)} · {r.methodLabel}
                      {r.auto && <Zap size={11} className="shrink-0 text-pago-blue" aria-label="plată automată" />}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`font-bold ${r.status === "esuata" ? "text-muted line-through" : "text-ink"}`}>{fmtRon(r.amount)}</span>
                    {r.status !== "confirmata" && <PaymentStatusTag status={r.status} />}
                  </span>
                </button>
              ))}
            </Card>
          </section>
        ))
      )}

      {open && <ReceiptSheet record={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
