import { DEMO_TODAY, daysUntil, fmtRon, percentOverAverage } from "@/lib/disputes";
import { daysLabel, fmtDay } from "@/lib/format";
import { eventState, eventsInMonth, splitPaid, type PaymentEvent } from "@/lib/payments";
import { dueReminders, reminderLabel } from "@/lib/reminders";
import { isUnused, priceIncrease, trialDaysLeft, yearlyCost } from "@/lib/subscriptions";
import type { Bill, DisputeTicket, ExpiryItem, HouseId, MeterSubmission, PaymentRecord, Settings, Subscription, SupplierConnection } from "@/types/pago";

export type NotificationTone = "alert" | "warning" | "info" | "success";

export type NotificationIcon = "flag" | "clock" | "bolt" | "plug" | "x" | "check" | "trend" | "gift" | "moon" | "shield" | "mail" | "gauge" | "wallet";

export interface AppNotification {
  id: string;
  tone: NotificationTone;
  icon: NotificationIcon;
  title: string;
  body: string;
  date: string;
  href: string;
}

export interface NotificationInput {
  houseId: HouseId;
  events: PaymentEvent[];
  bills: Bill[];
  subscriptions: Subscription[];
  expiries: ExpiryItem[];
  connections: SupplierConnection[];
  payments: PaymentRecord[];
  tickets: DisputeTicket[];
  readings: MeterSubmission[];
  settings: Settings;
  today?: string;
}

const TONE_ORDER: Record<NotificationTone, number> = { alert: 0, warning: 1, info: 2, success: 3 };
const MAX_CONFIRMATIONS = 3;

export function selfReadingOpen(bill: Bill, today: string = DEMO_TODAY): boolean {
  if (!bill.selfReading || !bill.meter) return false;
  const day = Number(today.slice(8, 10));
  return day >= bill.selfReading.fromDay && day <= bill.selfReading.toDay;
}

export function buildNotifications(input: NotificationInput): AppNotification[] {
  const today = input.today ?? DEMO_TODAY;
  const list: AppNotification[] = [];
  const bills = input.bills.filter((b) => b.houseId === input.houseId);
  const subs = input.subscriptions.filter((s) => s.houseId === input.houseId);
  const expiries = input.expiries.filter((e) => e.houseId === input.houseId);

  for (const b of bills) {
    if (b.status === "red_flag") {
      list.push({
        id: `flag-${b.id}`,
        tone: "alert",
        icon: "flag",
        title: `Factură suspectă: ${b.provider}`,
        body: `${fmtRon(b.amount)}, cu ${percentOverAverage(b)}% peste media ta. Verific-o înainte să plătești.`,
        date: b.issueDate,
        href: `/facturi/${b.id}`,
      });
    }
    if (selfReadingOpen(b, today) && !input.readings.some((r) => r.billId === b.id && r.submittedAt.slice(0, 7) === today.slice(0, 7))) {
      list.push({
        id: `reading-${b.id}-${today.slice(0, 7)}`,
        tone: "info",
        icon: "gauge",
        title: `Poți transmite indexul la ${b.provider}`,
        body: `Fereastra de autocitire e deschisă până pe ${b.selfReading?.toDay} ale lunii. Așa plătești consumul real, nu o estimare.`,
        date: today,
        href: `/facturi/${b.id}`,
      });
    }
  }

  for (const c of input.connections) {
    if (c.houseId !== input.houseId || c.status !== "deconectat") continue;
    list.push({
      id: `conn-${c.houseId}-${c.provider}`,
      tone: "alert",
      icon: "plug",
      title: `${c.provider} s-a deconectat`,
      body: "Facturile noi nu mai apar și plățile către acest furnizor eșuează. Istoricul tău e păstrat. Reconectează contul.",
      date: c.lastSyncAt.slice(0, 10),
      href: "/facturi/furnizori",
    });
  }

  const trialTargets = subs.filter((s) => trialDaysLeft(s, today) !== null).map((s) => s.id);

  for (const r of dueReminders(input.events, today, input.settings.reminderDays)) {
    const e = r.event;
    if (r.kind === "flagged" || trialTargets.includes(e.targetId)) continue;
    if (r.kind === "auto") {
      if (r.daysLeft > (e.autopayNotice ?? 3)) continue;
      list.push({
        id: `auto-${e.id}`,
        tone: "info",
        icon: "bolt",
        title: `Plată automată: ${e.title}`,
        body: `${fmtRon(e.amount)} se plătesc automat pe ${fmtDay(e.date)}. Poți opri plata oricând până atunci.`,
        date: today,
        href: e.href,
      });
      continue;
    }
    if (r.kind === "blocked") {
      list.push({
        id: `autoblock-${e.id}`,
        tone: "warning",
        icon: "shield",
        title: `Plata automată s-a oprit: ${e.title}`,
        body: `Suma de ${fmtRon(e.amount)} depășește limita ta de ${fmtRon(e.autopayLimit ?? 0)}. Verifică și plătește manual dacă e corectă.`,
        date: today,
        href: e.href,
      });
      continue;
    }
    if (r.kind === "failed") continue;
    list.push({
      id: `due-${e.id}-${r.threshold}`,
      tone: r.overdue ? "alert" : "warning",
      icon: "clock",
      title: r.overdue ? `Plată întârziată: ${e.title}` : `${e.title}: ${reminderLabel(r.daysLeft).toLowerCase()}`,
      body: r.overdue
        ? `${fmtRon(e.amount)} trebuiau plătiți pe ${fmtDay(e.date)}. Plătește acum ca să eviți penalizările.`
        : `${fmtRon(e.amount)} de plătit până pe ${fmtDay(e.date)}.`,
      date: r.overdue ? e.date : today,
      href: e.href,
    });
  }

  const confirmed = input.payments.filter((p) => p.houseId === input.houseId && p.status === "confirmata" && !p.external).slice(-MAX_CONFIRMATIONS);

  for (const p of input.payments) {
    if (p.houseId !== input.houseId) continue;
    if (p.status === "esuata") {
      list.push({
        id: `fail-${p.id}`,
        tone: "alert",
        icon: "x",
        title: `Plata către ${p.title} a eșuat`,
        body: p.failureReason ?? "Banii nu au plecat din cont. Încearcă din nou.",
        date: p.createdAt.slice(0, 10),
        href: "/istoric",
      });
    }
    if (confirmed.includes(p)) {
      list.push({
        id: `ok-${p.id}`,
        tone: "success",
        icon: "check",
        title: `Plată confirmată: ${p.title}`,
        body: `${fmtRon(p.amount)} au ajuns la furnizor. Referință ${p.reference}.`,
        date: p.createdAt.slice(0, 10),
        href: "/istoric",
      });
    }
  }

  for (const s of subs) {
    const increase = priceIncrease(s);
    if (increase && s.status === "activ") {
      list.push({
        id: `price-${s.id}-${s.price}`,
        tone: "warning",
        icon: "trend",
        title: `${s.name} s-a scumpit`,
        body: `De la ${fmtRon(s.previousPrice ?? 0)} la ${fmtRon(s.price)}. Asta înseamnă cu ${fmtRon(increase.yearlyDelta)} mai mult pe an.`,
        date: s.priceChangedOn ?? today,
        href: `/abonamente/${s.id}`,
      });
    }
    const trial = trialDaysLeft(s, today);
    if (trial !== null && trial <= 7) {
      list.push({
        id: `trial-${s.id}`,
        tone: "warning",
        icon: "gift",
        title: trial === 0 ? `Perioada de probă ${s.name} se termină azi` : `Perioada de probă ${s.name} se termină în ${daysLabel(trial)}`,
        body: `De pe ${fmtDay(s.trialEndsOn ?? today)} plătești ${fmtRon(s.price)}. Anulează înainte dacă nu vrei să fii taxat.`,
        date: today,
        href: `/abonamente/${s.id}`,
      });
    }
    if (isUnused(s)) {
      list.push({
        id: `unused-${s.id}`,
        tone: "info",
        icon: "moon",
        title: `Nu ai mai folosit ${s.name} de ${daysLabel(s.lastUsedDaysAgo ?? 0)}`,
        body: `Te costă ${fmtRon(yearlyCost(s))} pe an. Îl poți pune pe pauză sau anula din pagina abonamentului.`,
        date: today,
        href: `/abonamente/${s.id}`,
      });
    }
  }

  for (const e of expiries) {
    const days = daysUntil(e.expiresOn, today);
    if (days > 30) continue;
    list.push({
      id: `exp-${e.id}-${e.expiresOn}`,
      tone: days < 0 ? "alert" : days <= 14 ? "warning" : "info",
      icon: "shield",
      title: days < 0 ? `${e.kind} a expirat: ${e.subject}` : `${e.kind} expiră în ${daysLabel(days)}`,
      body: days < 0 ? `A expirat pe ${fmtDay(e.expiresOn)}. Reînnoiește acum din aplicație.` : `${e.subject}. Reînnoiește din timp, în două atingeri.`,
      date: days < 0 ? e.expiresOn : today,
      href: `/asigurari/${e.id}`,
    });
  }

  for (const t of input.tickets) {
    if (t.houseId !== input.houseId) continue;
    const bill = input.bills.find((b) => b.id === t.billId);
    if (t.stage === "stornata") {
      list.push({
        id: `ticket-${t.id}-${t.stage}`,
        tone: "success",
        icon: "check",
        title: `${bill?.provider ?? "Furnizorul"} a emis factura storno`,
        body: `Ai economisit ${fmtRon(t.disputedAmount)}. Factura corectă este de ${fmtRon(t.paidAmount)}.`,
        date: (t.resolvedAt ?? t.createdAt).slice(0, 10),
        href: `/facturi/${t.billId}`,
      });
      continue;
    }
    list.push({
      id: `ticket-${t.id}-${t.stage}`,
      tone: "info",
      icon: "mail",
      title: t.stage === "trimisa" ? `Sesizare trimisă către ${bill?.provider ?? "furnizor"}` : `${bill?.provider ?? "Furnizorul"} analizează sesizarea ta`,
      body: `${fmtRon(t.disputedAmount)} rămân înghețați. Termen legal de răspuns: ${daysLabel(t.legalDeadlineDays)}.`,
      date: t.createdAt.slice(0, 10),
      href: `/facturi/${t.billId}`,
    });
  }

  const budget = input.settings.monthlyBudget;
  if (budget) {
    const month = eventsInMonth(input.events, Number(today.slice(0, 4)), Number(today.slice(5, 7)));
    const { paid, remaining } = splitPaid(month.filter((e) => eventState(e) !== "estimated"));
    if (paid + remaining > budget) {
      list.push({
        id: `budget-${today.slice(0, 7)}`,
        tone: "warning",
        icon: "wallet",
        title: "Luna asta depășești bugetul",
        body: `Ai ${fmtRon(paid + remaining)} de plată față de bugetul de ${fmtRon(budget)}. Vezi în Statistici unde se duc banii.`,
        date: today,
        href: "/statistici",
      });
    }
  }

  return list.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}
