"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight, History, PlugZap, Sparkles, Users, Zap, type LucideIcon } from "lucide-react";
import { EventAction, EventRow } from "@/components/payments/EventRow";
import { EventBadge } from "@/components/shared/Badges";
import { EmptyState } from "@/components/shared/Controls";
import { Sheet } from "@/components/shared/Sheet";
import { useFamily } from "@/context/FamilyContext";
import { FAMILY_NAME } from "@/data/mockFamilyData";
import { DEMO_TODAY, fmtRon } from "@/lib/disputes";
import { MONTHS, WEEKDAYS, fmtDay, fmtLongDate, plural } from "@/lib/format";
import { buildEvents, eventsInMonth, eventsOnDay, isOverdue, isPayable, monthDays, summarizeMonth, toCheckoutItem, toIso, weekdayIndex, type PaymentEvent } from "@/lib/payments";
import { dueReminders, reminderLabel, thresholdLabel, type Reminder } from "@/lib/reminders";

const [todayYear, todayMonth] = DEMO_TODAY.split("-").map(Number);
const VISIBLE_REMINDERS = 3;

const SHORTCUTS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/istoric", label: "Istoric", Icon: History },
  { href: "/profil/plati-automate", label: "Plăți automate", Icon: Zap },
  { href: "/servicii", label: "Alte plăți", Icon: Sparkles },
  { href: "/familie", label: "Familie", Icon: Users },
];

export function HomeScreen() {
  const { house, ledger, yearEvents, houseBills, houseSubscriptions, houseExpiries, today, snoozed, settings, openCheckout } = useFamily();
  const [cursor, setCursor] = useState({ year: todayYear, month: todayMonth });
  const [openDate, setOpenDate] = useState<string | null>(null);

  const events = cursor.year === todayYear ? yearEvents : buildEvents(ledger, house.id, cursor.year);
  const monthEvents = eventsInMonth(events, cursor.year, cursor.month);
  const summary = summarizeMonth(monthEvents, today);
  const unpaid = monthEvents.filter((e) => !e.paid);
  const payable = unpaid.filter(isPayable);
  const reminders = dueReminders(yearEvents, today, settings.reminderDays).filter((r) => !snoozed.includes(r.event.id));
  const alerts = houseBills.filter((b) => b.status === "red_flag").length;
  const overdue = yearEvents.filter((e) => isOverdue(e, today)).length;
  const empty = houseBills.length + houseSubscriptions.length + houseExpiries.length === 0;

  const byDay = new Map<string, PaymentEvent[]>();
  for (const e of monthEvents) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const index = c.year * 12 + (c.month - 1) + delta;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });
  }

  const blanks = Array.from({ length: weekdayIndex(cursor.year, cursor.month) });
  const days = Array.from({ length: monthDays(cursor.year, cursor.month) }, (_, i) => i + 1);
  const monthName = MONTHS[cursor.month - 1];

  return (
    <div className="flex flex-col gap-4">
      {alerts > 0 && (
        <Link href="/facturi" className="flex items-center justify-between rounded-2xl bg-alert-bg px-4 py-3 text-sm font-semibold text-alert">
          <span>
            🚨 Ai {alerts} {alerts === 1 ? "factură suspectă" : "facturi suspecte"} · {FAMILY_NAME}
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}
      {alerts === 0 && overdue > 0 && (
        <Link href="/notificari" className="flex items-center justify-between rounded-2xl bg-alert-bg px-4 py-3 text-sm font-semibold text-alert">
          <span>⏰ Ai {plural(overdue, "plată întârziată", "plăți întârziate")}</span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <nav aria-label="Scurtături" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {SHORTCUTS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="pill shrink-0 bg-surface text-ink shadow-card">
            <Icon size={14} className="text-pago-blue" /> {label}
          </Link>
        ))}
      </nav>

      {empty && (
        <EmptyState icon={PlugZap} title={`${house.name} e gata de configurat`} text="Conectează furnizorii și adaugă abonamentele, iar plățile apar automat în calendar.">
          <Link href="/facturi/furnizori" className="btn-dark w-full text-sm">
            Conectează un furnizor
          </Link>
          <Link href="/abonamente/nou" className="btn-soft w-full text-sm">
            Adaugă un abonament
          </Link>
        </EmptyState>
      )}

      <section className="rounded-card bg-surface p-2 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <Link href="/statistici" aria-label="Statistici" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
            <BarChart3 size={18} />
          </Link>
          <div className="min-w-0 text-center">
            <p className="truncate text-lg font-extrabold text-ink">
              {monthName}, {cursor.year}
            </p>
            <p className="text-sm font-semibold text-muted">
              {summary.hasEstimates ? "≈ " : ""}
              {fmtRon(summary.total)} <span className="font-normal">({fmtRon(summary.remaining)} rămas)</span>
            </p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => shiftMonth(-1)} aria-label="Luna anterioară" className="grid size-10 place-items-center rounded-full bg-surface-2 text-ink">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => shiftMonth(1)} aria-label="Luna următoare" className="grid size-10 place-items-center rounded-full bg-surface-2 text-ink">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-x-0.5 gap-y-1">
          {WEEKDAYS.map((d) => (
            <span key={d} className="rounded-full bg-surface-2 py-1.5 text-center text-xs font-semibold text-muted">
              {d}
            </span>
          ))}
          {blanks.map((_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const date = toIso(cursor.year, cursor.month, day);
            const dayEvents = byDay.get(date) ?? [];
            const isToday = date === today;
            const late = dayEvents.some((e) => isOverdue(e, today));
            return (
              <button
                key={date}
                onClick={() => setOpenDate(date)}
                aria-label={dayEvents.length ? `${fmtDay(date)}, ${plural(dayEvents.length, "plată", "plăți")}${late ? ", întârziată" : ""}` : fmtDay(date)}
                className={`flex aspect-square min-h-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl p-0.5 text-sm font-bold transition hover:bg-surface-2 ${
                  isToday ? "text-pago-blue ring-2 ring-pago-blue" : late ? "text-alert" : "text-ink"
                }`}
              >
                <span>{day}</span>
                {dayEvents.length > 0 && (
                  <span className={`grid w-full place-items-center gap-0.5 ${dayEvents.length === 1 ? "" : "grid-cols-2"}`}>
                    {dayEvents.slice(0, dayEvents.length > 4 ? 3 : 4).map((e) => (
                      <EventBadge key={e.id} event={e} size="sm" />
                    ))}
                    {dayEvents.length > 4 && <span className="grid size-5 place-items-center rounded bg-surface-2 text-[9px] font-bold text-muted">+{dayEvents.length - 3}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {reminders.length > 0 && <RemindersCard reminders={reminders} thresholds={settings.reminderDays} />}

      <section className="rounded-card bg-surface p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">De plătit în {monthName.toLowerCase()}</p>
          {payable.length > 1 && (
            <button onClick={() => openCheckout(payable.map(toCheckoutItem), "Plătește tot")} className="pill pill-primary">
              Plătește tot ({payable.length})
            </button>
          )}
        </div>
        {unpaid.length === 0 ? (
          <p className="text-sm text-muted">{monthEvents.length === 0 ? "Nicio plată în această lună." : "Ai plătit tot în această lună."}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {unpaid.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ul>
        )}
        {summary.frozen > 0 && <p className="mt-3 text-xs text-muted">❄️ {fmtRon(summary.frozen)} sunt înghețați până la factura storno și nu intră în total.</p>}
      </section>

      {openDate && <DaySheet date={openDate} events={eventsOnDay(events, openDate)} onClose={() => setOpenDate(null)} />}
    </div>
  );
}

function RemindersCard({ reminders, thresholds }: { reminders: Reminder[]; thresholds: number[] }) {
  const { openCheckout, payExternally, snoozeReminder, toast } = useFamily();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? reminders : reminders.slice(0, VISIBLE_REMINDERS);
  const legend = [...thresholds]
    .sort((a, b) => b - a)
    .map((t) => (t === 0 ? "ziua scadenței" : plural(t, "zi", "zile")))
    .join(" · ");

  function paidElsewhere(event: PaymentEvent) {
    payExternally(toCheckoutItem(event));
    toast("Am notat plata. O găsești în Istoric.");
  }

  function snooze(event: PaymentEvent) {
    snoozeReminder(event.id);
    toast("Reminder amânat", "info");
  }

  return (
    <section className="rounded-card bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Remindere</p>
        <Link href="/profil/setari" className="truncate text-[11px] font-semibold text-muted" title={thresholds.map(thresholdLabel).join(", ")}>
          {legend}
        </Link>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {visible.map((r) => {
          const e = r.event;
          const urgent = r.overdue || r.daysLeft === 0;
          return (
            <li key={e.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <Link href={e.href} className="flex min-w-0 items-center gap-3">
                  <EventBadge event={e} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{e.title}</span>
                    <span className={`block truncate text-xs font-bold ${urgent ? "text-alert" : "text-muted"}`}>
                      {r.kind === "auto" ? `Se plătește automat pe ${fmtDay(e.date)}` : reminderLabel(r.daysLeft)}
                      {r.kind === "blocked" ? " · peste limita plății automate" : ""}
                      {r.kind === "flagged" ? " · factură suspectă" : ""}
                    </span>
                  </span>
                </Link>
                <span className="shrink-0 font-bold text-ink">{fmtRon(e.amount)}</span>
              </div>
              <div className="flex flex-wrap gap-2 pl-9">
                {r.kind === "auto" ? (
                  <Link href={e.href} className="pill pill-soft">
                    Detalii
                  </Link>
                ) : r.kind === "flagged" || r.kind === "renew" ? (
                  <EventAction event={e} />
                ) : (
                  <button onClick={() => openCheckout([toCheckoutItem(e)])} className="pill pill-primary">
                    {r.kind === "failed" ? "Reîncearcă" : "Plătește"}
                  </button>
                )}
                {r.kind !== "auto" && r.kind !== "flagged" && (
                  <button onClick={() => paidElsewhere(e)} className="pill pill-soft">
                    Am plătit deja
                  </button>
                )}
                <button onClick={() => snooze(e)} className="pill pill-soft">
                  Amână
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {reminders.length > VISIBLE_REMINDERS && (
        <button onClick={() => setShowAll((v) => !v)} className="mt-3 min-h-9 w-full text-sm font-semibold text-pago-blue">
          {showAll ? "Arată mai puține" : `Vezi toate cele ${reminders.length} remindere`}
        </button>
      )}
    </section>
  );
}

function DaySheet({ date, events, onClose }: { date: string; events: PaymentEvent[]; onClose: () => void }) {
  const total = events.reduce((sum, e) => sum + e.amount, 0);
  return (
    <Sheet open onClose={onClose} title={fmtLongDate(date)}>
      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nicio plată în această zi.</p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-line">
            {events.map((e) => (
              <EventRow key={e.id} event={e} showDate={false} onNavigate={onClose} />
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm font-semibold text-muted">Total</span>
            <span className="text-lg font-extrabold text-ink">{fmtRon(total)}</span>
          </div>
        </>
      )}
    </Sheet>
  );
}
