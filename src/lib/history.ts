import { DEMO_TODAY } from "@/lib/disputes";
import { makeReference, payeeLabel } from "@/lib/checkout";
import { CATEGORY_META, type PaymentEvent } from "@/lib/payments";
import type { HouseId, PaymentCategory, PaymentRecord, PaymentStatus } from "@/types/pago";

export type HistoryPeriod = "luna" | "3luni" | "an" | "tot";
export type HistoryStatusFilter = "toate" | "confirmate" | "in_curs" | "esuate";

export interface HistoryFilters {
  query: string;
  category: PaymentCategory | "toate";
  status: HistoryStatusFilter;
  period: HistoryPeriod;
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = { query: "", category: "toate", status: "toate", period: "3luni" };

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  procesare: "În procesare",
  trimisa: "Trimisă furnizorului",
  confirmata: "Confirmată",
  esuata: "Eșuată",
};

export interface HistoryOptions {
  houseId: HouseId;
  defaultMethodLabel: string;
  autopayTargets: string[];
  today?: string;
}

export function buildHistory(events: PaymentEvent[], payments: PaymentRecord[], options: HistoryOptions): PaymentRecord[] {
  const today = options.today ?? DEMO_TODAY;
  const real = payments.filter((p) => p.houseId === options.houseId);
  const covered = new Set(real.filter((p) => p.status === "confirmata").map((p) => p.eventId));

  const synthetic: PaymentRecord[] = events
    .filter((e) => e.paid && !e.estimated && e.date <= today && !covered.has(e.id) && e.targetKind !== "extra")
    .map((e) => {
      const auto = options.autopayTargets.includes(e.targetId);
      return {
        id: `hist-${e.id}`,
        eventId: e.id,
        targetId: e.targetId,
        targetKind: e.targetKind,
        houseId: e.houseId,
        title: e.title,
        payee: payeeLabel(e.title),
        category: e.category,
        amount: e.amount,
        fee: 0,
        discount: 0,
        pointsUsed: 0,
        pointsEarned: 0,
        methodId: "history",
        methodLabel: options.defaultMethodLabel,
        status: "confirmata" as const,
        createdAt: `${e.date}T09:00:00`,
        reference: makeReference(e.id),
        auto,
      };
    });

  return [...real, ...synthetic].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

function periodStart(period: HistoryPeriod, today: string): string {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  if (period === "luna") return `${today.slice(0, 7)}-01`;
  if (period === "an") return `${year}-01-01`;
  if (period === "3luni") {
    const index = year * 12 + (month - 1) - 2;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-01`;
  }
  return "0000-00-00";
}

function matchesStatus(status: PaymentStatus, filter: HistoryStatusFilter): boolean {
  if (filter === "toate") return true;
  if (filter === "confirmate") return status === "confirmata";
  if (filter === "esuate") return status === "esuata";
  return status === "procesare" || status === "trimisa";
}

const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function filterHistory(records: PaymentRecord[], filters: HistoryFilters, today: string = DEMO_TODAY): PaymentRecord[] {
  const start = periodStart(filters.period, today);
  const query = plain(filters.query.trim());
  return records.filter((r) => {
    if (r.createdAt.slice(0, 10) < start) return false;
    if (filters.category !== "toate" && r.category !== filters.category) return false;
    if (!matchesStatus(r.status, filters.status)) return false;
    if (query && !plain(`${r.title} ${r.reference} ${r.methodLabel}`).includes(query)) return false;
    return true;
  });
}

export function sumConfirmed(records: PaymentRecord[]): number {
  return records.filter((r) => r.status === "confirmata").reduce((sum, r) => sum + r.amount, 0);
}

export function groupByMonth(records: PaymentRecord[]): { month: string; records: PaymentRecord[] }[] {
  const groups: { month: string; records: PaymentRecord[] }[] = [];
  for (const record of records) {
    const month = record.createdAt.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.records.push(record);
    else groups.push({ month, records: [record] });
  }
  return groups;
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export function historyCsv(records: PaymentRecord[]): string {
  const header = ["Data", "Furnizor", "Categorie", "Suma (RON)", "Status", "Metodă", "Referință"];
  const rows = records.map((r) => [
    r.createdAt.slice(0, 16).replace("T", " "),
    r.title,
    CATEGORY_META[r.category].label,
    r.amount.toFixed(2),
    STATUS_LABEL[r.status],
    r.auto ? `${r.methodLabel} (plată automată)` : r.methodLabel,
    r.reference,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
