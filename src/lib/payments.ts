import { bills, expiries, subscriptions } from "@/data/mockFamilyData";
import { DEMO_TODAY } from "@/lib/disputes";
import type { HouseId } from "@/types/pago";

export type PaymentCategory = "utilitati" | "abonamente" | "asigurari";

export interface PaymentEvent {
  id: string;
  date: string;
  title: string;
  amount: number;
  category: PaymentCategory;
  paid: boolean;
}

export const CATEGORY_META: Record<PaymentCategory, { label: string; dot: string; text: string; tag: "blue" | "red" | "green" }> = {
  utilitati: { label: "Facturi", dot: "bg-cat-blue", text: "text-cat-blue", tag: "blue" },
  abonamente: { label: "Abonamente", dot: "bg-cat-red", text: "text-cat-red", tag: "red" },
  asigurari: { label: "Mașini", dot: "bg-cat-green", text: "text-cat-green", tag: "green" },
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
const dayOf = (date: string) => Number(date.slice(8, 10));
const onDay = (y: number, m: number, d: number) => iso(y, m, Math.min(d, daysInMonth(y, m)));

export function buildEvents(houseId: HouseId, year: number): PaymentEvent[] {
  const events: PaymentEvent[] = [];

  for (let m = 1; m <= 12; m++) {
    const monthKey = `${year}-${pad(m)}`;

    for (const b of bills.filter((x) => x.houseId === houseId)) {
      const settled = b.status === "platita" || b.status === "platita_partial";
      if (b.dueDate.slice(0, 7) === monthKey) {
        events.push({ id: `${b.id}-${monthKey}`, date: b.dueDate, title: b.provider, amount: b.amount, category: "utilitati", paid: settled || b.dueDate < DEMO_TODAY });
      } else {
        const past = b.history.find((h) => h.month === monthKey);
        if (past) {
          const date = onDay(year, m, dayOf(b.dueDate));
          events.push({ id: `${b.id}-${monthKey}`, date, title: b.provider, amount: past.amount, category: "utilitati", paid: date < DEMO_TODAY });
        }
      }
    }

    for (const s of subscriptions.filter((x) => x.houseId === houseId)) {
      const yearly = s.billing === "yearly";
      if (yearly && Number(s.renewsOn.slice(5, 7)) !== m) continue;
      const date = onDay(year, m, dayOf(s.renewsOn));
      events.push({ id: `${s.id}-${monthKey}`, date, title: s.name, amount: yearly ? s.monthlyPrice * 12 : s.monthlyPrice, category: "abonamente", paid: date < DEMO_TODAY });
    }
  }

  for (const e of expiries.filter((x) => x.houseId === houseId)) {
    const month = Number(e.expiresOn.slice(5, 7));
    const day = dayOf(e.expiresOn);
    const date = onDay(year, month, day);
    events.push({ id: `${e.id}-${year}`, date, title: `${e.kind} · ${e.vehicle}`, amount: e.price, category: "asigurari", paid: date < DEMO_TODAY });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function eventsInMonth(events: PaymentEvent[], year: number, month: number): PaymentEvent[] {
  const key = `${year}-${pad(month)}`;
  return events.filter((e) => e.date.startsWith(key));
}

export function eventsOnDay(events: PaymentEvent[], date: string): PaymentEvent[] {
  return events.filter((e) => e.date === date);
}

const sum = (xs: PaymentEvent[]) => xs.reduce((s, e) => s + e.amount, 0);

export function splitPaid(events: PaymentEvent[]) {
  return { paid: sum(events.filter((e) => e.paid)), remaining: sum(events.filter((e) => !e.paid)) };
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
  const byCategory: Record<PaymentCategory, number> = { utilitati: 0, abonamente: 0, asigurari: 0 };
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
  const items = [...grouped.values()]
    .map((i) => ({ ...i, averageMonthly: i.total / 12 }))
    .sort((a, b) => b.total - a.total);
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

export function toIso(year: number, month: number, day: number): string {
  return iso(year, month, day);
}
