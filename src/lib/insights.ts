import { fmtRon } from "@/lib/disputes";
import { MONTHS } from "@/lib/format";
import { eventsInMonth, type PaymentEvent } from "@/lib/payments";
import { isUnused, potentialSavings, totalYearly } from "@/lib/subscriptions";
import type { Subscription } from "@/types/pago";

export type InsightTone = "info" | "warning" | "success";

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  text: string;
  href?: string;
}

export interface InsightInput {
  events: PaymentEvent[];
  subscriptions: Subscription[];
  year: number;
  month: number;
  budget: number | null;
}

const total = (events: PaymentEvent[]) => events.reduce((sum, e) => sum + e.amount, 0);

export function monthChange(events: PaymentEvent[], year: number, month: number): { current: number; previous: number; percent: number } | null {
  if (month <= 1) return null;
  const current = total(eventsInMonth(events, year, month));
  const previous = total(eventsInMonth(events, year, month - 1));
  if (previous <= 0) return null;
  return { current, previous, percent: Math.round(((current - previous) / previous) * 100) };
}

export function buildInsights(input: InsightInput): Insight[] {
  const insights: Insight[] = [];
  const monthEvents = eventsInMonth(input.events, input.year, input.month);
  const monthName = MONTHS[input.month - 1].toLowerCase();

  const change = monthChange(input.events, input.year, input.month);
  if (change && change.percent !== 0) {
    const up = change.percent > 0;
    insights.push({
      id: "month-change",
      tone: up ? "warning" : "success",
      title: up ? `Cu ${change.percent}% mai mult decât luna trecută` : `Cu ${Math.abs(change.percent)}% mai puțin decât luna trecută`,
      text: `${fmtRon(change.current)} în ${monthName}, față de ${fmtRon(change.previous)} în ${MONTHS[input.month - 2].toLowerCase()}.`,
    });
  }

  const biggest = [...monthEvents].sort((a, b) => b.amount - a.amount)[0];
  if (biggest) {
    insights.push({
      id: "biggest",
      tone: biggest.flagged ? "warning" : "info",
      title: `Cea mai mare plată: ${biggest.title}`,
      text: biggest.flagged
        ? `${fmtRon(biggest.amount)}, dar factura pare greșită. Verific-o înainte să plătești.`
        : `${fmtRon(biggest.amount)}, adică ${Math.round((biggest.amount / Math.max(1, total(monthEvents))) * 100)}% din plățile lunii.`,
      href: biggest.href,
    });
  }

  if (input.budget) {
    const spent = total(monthEvents);
    const over = spent > input.budget;
    insights.push({
      id: "budget",
      tone: over ? "warning" : "success",
      title: over ? `Peste buget cu ${fmtRon(spent - input.budget)}` : `În buget: mai ai ${fmtRon(input.budget - spent)}`,
      text: `Bugetul lunar este ${fmtRon(input.budget)}, iar plățile din ${monthName} însumează ${fmtRon(spent)}.`,
      href: "/profil/setari",
    });
  }

  const yearly = totalYearly(input.subscriptions);
  if (yearly > 0) {
    insights.push({
      id: "subscriptions-year",
      tone: "info",
      title: `Abonamentele te costă ${fmtRon(Math.round(yearly))} pe an`,
      text: "Plățile anuale și trimestriale sunt incluse, chiar dacă nu apar în fiecare lună.",
      href: "/abonamente",
    });
  }

  const savings = potentialSavings(input.subscriptions);
  if (savings > 0) {
    const names = input.subscriptions.filter(isUnused).map((s) => s.name);
    insights.push({
      id: "unused",
      tone: "success",
      title: `Poți economisi ${fmtRon(Math.round(savings))} pe an`,
      text: `Nu ai mai folosit de mult: ${names.join(", ")}. Pune pe pauză sau anulează ce nu îți trebuie.`,
      href: "/abonamente",
    });
  }

  return insights;
}
