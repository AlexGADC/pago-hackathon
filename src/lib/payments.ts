import { DEMO_TODAY } from "@/lib/disputes";
import { dateParts, daysInMonth, pad2, toIso } from "@/lib/format";
import { isChargedOn, occurrenceDate, occursInMonth, priceOn } from "@/lib/subscriptions";
import type {
  AutopayRule,
  Bill,
  CheckoutItem,
  DisputeTicket,
  ExpiryItem,
  HouseId,
  PaymentCategory,
  PaymentRecord,
  Subscription,
  TargetKind,
} from "@/types/pago";

export type { PaymentCategory } from "@/types/pago";

export interface LedgerData {
  bills: Bill[];
  subscriptions: Subscription[];
  expiries: ExpiryItem[];
  payments: PaymentRecord[];
  tickets: DisputeTicket[];
  autopay: AutopayRule[];
}

export type AutopayState = "none" | "scheduled" | "blocked";

export interface PaymentEvent {
  id: string;
  date: string;
  title: string;
  amount: number;
  category: PaymentCategory;
  paid: boolean;
  targetId: string;
  targetKind: TargetKind;
  houseId: HouseId;
  href: string;
  estimated: boolean;
  flagged: boolean;
  frozen: number;
  autopay: AutopayState;
  autopayLimit?: number;
  autopayNotice?: number;
  record?: PaymentRecord;
}

export type EventState = "paid" | "pending" | "estimated" | "flagged" | "failed" | "renew" | "auto" | "blocked" | "due";

export const CATEGORIES: PaymentCategory[] = ["utilitati", "abonamente", "asigurari", "servicii"];

export const CATEGORY_META: Record<PaymentCategory, { label: string; dot: string; text: string; soft: string; tag: "blue" | "red" | "green" | "orange" }> = {
  utilitati: { label: "Facturi", dot: "bg-cat-blue", text: "text-cat-blue", soft: "bg-cat-blue/15", tag: "blue" },
  abonamente: { label: "Abonamente", dot: "bg-cat-red", text: "text-cat-red", soft: "bg-cat-red/15", tag: "red" },
  asigurari: { label: "Asigurări", dot: "bg-cat-green", text: "text-cat-green", soft: "bg-cat-green/15", tag: "green" },
  servicii: { label: "Alte plăți", dot: "bg-cat-amber", text: "text-cat-amber", soft: "bg-cat-amber/15", tag: "orange" },
};

const onDay = (year: number, month: number, day: number) => toIso(year, month, Math.min(day, daysInMonth(year, month)));

export function billEventId(bill: Bill): string {
  return `${bill.id}-${bill.dueDate.slice(0, 7)}`;
}

export function expiryEventId(item: ExpiryItem): string {
  return `${item.id}-${item.expiresOn.slice(0, 4)}`;
}

type Draft = Omit<PaymentEvent, "record" | "autopay" | "autopayLimit" | "autopayNotice">;

export function buildEvents(data: LedgerData, houseId: HouseId, year: number, today: string = DEMO_TODAY): PaymentEvent[] {
  const latest = new Map<string, PaymentRecord>();
  for (const p of data.payments) {
    if (p.houseId !== houseId) continue;
    const current = latest.get(p.eventId);
    if (!current || p.createdAt >= current.createdAt) latest.set(p.eventId, p);
  }

  const drafts: Draft[] = [];

  for (const b of data.bills) {
    if (b.houseId !== houseId) continue;
    const dueKey = b.dueDate.slice(0, 7);
    const dueDay = dateParts(b.dueDate)[2];
    const ticket = data.tickets.find((t) => t.billId === b.id);
    const base = { title: b.provider, category: "utilitati" as const, targetId: b.id, targetKind: "bill" as const, houseId, href: `/facturi/${b.id}` };

    for (let m = 1; m <= 12; m++) {
      const monthKey = `${year}-${pad2(m)}`;
      const id = `${b.id}-${monthKey}`;
      if (monthKey === dueKey) {
        const disputed = b.status === "contestata" || b.status === "platita_partial" ? ticket : undefined;
        drafts.push({
          ...base,
          id,
          date: b.dueDate,
          amount: disputed ? disputed.paidAmount : b.amount,
          paid: b.status === "platita" || b.status === "platita_partial",
          estimated: false,
          flagged: b.status === "red_flag",
          frozen: disputed ? disputed.disputedAmount : 0,
        });
        continue;
      }
      const past = b.history.find((h) => h.month === monthKey);
      if (past) {
        drafts.push({ ...base, id, date: onDay(year, m, dueDay), amount: past.amount, paid: true, estimated: false, flagged: false, frozen: 0 });
      } else if (monthKey > dueKey) {
        drafts.push({ ...base, id, date: onDay(year, m, dueDay), amount: b.averageAmount, paid: false, estimated: true, flagged: false, frozen: 0 });
      }
    }
  }

  for (const s of data.subscriptions) {
    if (s.houseId !== houseId) continue;
    for (let m = 1; m <= 12; m++) {
      if (!occursInMonth(s, year, m)) continue;
      const date = occurrenceDate(s, year, m);
      if (!isChargedOn(s, date)) continue;
      drafts.push({
        id: `${s.id}-${year}-${pad2(m)}`,
        date,
        title: s.name,
        amount: priceOn(s, date),
        category: "abonamente",
        paid: date < today,
        targetId: s.id,
        targetKind: "subscription",
        houseId,
        href: `/abonamente/${s.id}`,
        estimated: false,
        flagged: false,
        frozen: 0,
      });
    }
  }

  for (const e of data.expiries) {
    if (e.houseId !== houseId) continue;
    const [expYear, expMonth, expDay] = dateParts(e.expiresOn);
    if (year < expYear) continue;
    drafts.push({
      id: `${e.id}-${year}`,
      date: onDay(year, expMonth, expDay),
      title: `${e.kind} · ${e.subject}`,
      amount: e.price,
      category: "asigurari",
      paid: false,
      targetId: e.id,
      targetKind: "expiry",
      houseId,
      href: `/asigurari/${e.id}`,
      estimated: year > expYear,
      flagged: false,
      frozen: 0,
    });
  }

  const known = new Set(drafts.map((d) => d.id));
  for (const p of data.payments) {
    if (p.houseId !== houseId || p.status !== "confirmata" || known.has(p.eventId)) continue;
    if (Number(p.createdAt.slice(0, 4)) !== year) continue;
    known.add(p.eventId);
    drafts.push({
      id: p.eventId,
      date: p.createdAt.slice(0, 10),
      title: p.title,
      amount: p.amount,
      category: p.category,
      paid: true,
      targetId: p.targetId ?? p.eventId,
      targetKind: "extra",
      houseId,
      href: "/istoric",
      estimated: false,
      flagged: false,
      frozen: 0,
    });
  }

  return drafts
    .map((draft): PaymentEvent => {
      const record = latest.get(draft.id);
      const paid = draft.paid || record?.status === "confirmata";
      const rule = draft.targetKind === "extra" ? undefined : data.autopay.find((r) => r.targetId === draft.targetId && r.enabled);
      let autopay: AutopayState = "none";
      if (rule && !paid && draft.date >= today) autopay = draft.flagged || draft.amount > rule.maxAmount ? "blocked" : "scheduled";
      return { ...draft, paid, record, autopay, autopayLimit: rule?.maxAmount, autopayNotice: rule?.noticeDays };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export function eventState(e: PaymentEvent): EventState {
  if (e.paid) return "paid";
  if (e.record && (e.record.status === "procesare" || e.record.status === "trimisa")) return "pending";
  if (e.estimated) return "estimated";
  if (e.flagged) return "flagged";
  if (e.targetKind === "expiry") return e.autopay === "scheduled" ? "auto" : "renew";
  if (e.record?.status === "esuata") return "failed";
  if (e.autopay === "scheduled") return "auto";
  if (e.autopay === "blocked") return "blocked";
  return "due";
}

export function isPayable(e: PaymentEvent): boolean {
  const state = eventState(e);
  return state === "due" || state === "blocked" || state === "failed";
}

export function isOverdue(e: PaymentEvent, today: string = DEMO_TODAY): boolean {
  return !e.paid && !e.estimated && e.date < today;
}

export function toCheckoutItem(e: PaymentEvent): CheckoutItem {
  return { eventId: e.id, targetId: e.targetId, targetKind: e.targetKind, houseId: e.houseId, title: e.title, amount: e.amount, category: e.category };
}

export function upcomingEvent(data: LedgerData, houseId: HouseId, targetId: string, today: string = DEMO_TODAY): PaymentEvent | undefined {
  const year = Number(today.slice(0, 4));
  for (const y of [year, year + 1]) {
    const found = buildEvents(data, houseId, y, today).find((e) => e.targetId === targetId && !e.paid);
    if (found) return found;
  }
  return undefined;
}

export function eventsInMonth(events: PaymentEvent[], year: number, month: number): PaymentEvent[] {
  const key = `${year}-${pad2(month)}`;
  return events.filter((e) => e.date.startsWith(key));
}

export function eventsOnDay(events: PaymentEvent[], date: string): PaymentEvent[] {
  return events.filter((e) => e.date === date);
}

const sum = (xs: PaymentEvent[]) => xs.reduce((s, e) => s + e.amount, 0);

export function splitPaid(events: PaymentEvent[]) {
  return { paid: sum(events.filter((e) => e.paid)), remaining: sum(events.filter((e) => !e.paid)) };
}

export interface MonthSummary {
  total: number;
  paid: number;
  remaining: number;
  frozen: number;
  overdueCount: number;
  autoCount: number;
  unpaidCount: number;
  hasEstimates: boolean;
}

export function summarizeMonth(events: PaymentEvent[], today: string = DEMO_TODAY): MonthSummary {
  const { paid, remaining } = splitPaid(events);
  return {
    total: paid + remaining,
    paid,
    remaining,
    frozen: events.reduce((s, e) => s + e.frozen, 0),
    overdueCount: events.filter((e) => isOverdue(e, today)).length,
    autoCount: events.filter((e) => eventState(e) === "auto").length,
    unpaidCount: events.filter((e) => !e.paid).length,
    hasEstimates: events.some((e) => e.estimated),
  };
}

export interface YearSummary {
  year: number;
  total: number;
  averageMonthly: number;
  byCategory: Record<PaymentCategory, number>;
  byMonth: number[];
  peakMonths: number[];
  items: { name: string; category: PaymentCategory; total: number; averageMonthly: number; count: number }[];
}

export function summarizeYear(events: PaymentEvent[], year: number): YearSummary {
  const yearEvents = events.filter((e) => e.date.startsWith(String(year)));
  const byCategory: Record<PaymentCategory, number> = { utilitati: 0, abonamente: 0, asigurari: 0, servicii: 0 };
  const byMonth = Array<number>(12).fill(0);
  const grouped = new Map<string, { name: string; category: PaymentCategory; total: number; count: number }>();

  for (const e of yearEvents) {
    byCategory[e.category] += e.amount;
    byMonth[Number(e.date.slice(5, 7)) - 1] += e.amount;
    const current = grouped.get(e.title) ?? { name: e.title, category: e.category, total: 0, count: 0 };
    current.total += e.amount;
    current.count += 1;
    grouped.set(e.title, current);
  }

  const total = sum(yearEvents);
  const items = [...grouped.values()].map((i) => ({ ...i, averageMonthly: i.total / 12 })).sort((a, b) => b.total - a.total);
  const peakMonths = byMonth
    .map((amount, index) => ({ amount, index }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((x) => x.index);

  return { year, total, averageMonthly: total / 12, byCategory, byMonth, peakMonths, items };
}

export function weekdayIndex(year: number, month: number): number {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7;
}

export function monthDays(year: number, month: number): number {
  return daysInMonth(year, month);
}

export { toIso };
