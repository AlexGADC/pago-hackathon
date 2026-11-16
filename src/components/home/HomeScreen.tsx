"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart3, Car, ChevronLeft, ChevronRight, Receipt, Repeat, X } from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { FAMILY_NAME } from "@/data/mockFamilyData";
import { CATEGORY_META, buildEvents, eventsInMonth, eventsOnDay, monthDays, splitPaid, toIso, weekdayIndex, type PaymentEvent } from "@/lib/payments";
import { DEMO_TODAY, fmtRon } from "@/lib/disputes";
import { dueReminders, reminderLabel } from "@/lib/reminders";

const MONTHS = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
const WEEKDAYS = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];

const [todayYear, todayMonth] = DEMO_TODAY.split("-").map(Number);

const CATEGORY_ICON: Record<PaymentEvent["category"], typeof Receipt> = {
  utilitati: Receipt,
  abonamente: Repeat,
  asigurari: Car,
};

function Avatar({ event }: { event: PaymentEvent }) {
  const meta = CATEGORY_META[event.category];
  const Icon = CATEGORY_ICON[event.category];
  return (
    <span
      title={event.title}
      className={`grid size-6 shrink-0 place-items-center rounded-md ${
        event.paid ? `${meta.dot} text-white` : `bg-white ${meta.text} border-2 border-current`
      }`}
    >
      <Icon size={12} strokeWidth={2.4} />
    </span>
  );
}

export function HomeScreen() {
  const { house, bills } = useFamily();
  const [cursor, setCursor] = useState({ year: todayYear, month: todayMonth });
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [paidIds, setPaidIds] = useState<string[]>([]);
  const [snoozed, setSnoozed] = useState<string[]>([]);

  const baseEvents = useMemo(() => buildEvents(house.id, cursor.year), [house.id, cursor.year]);
  const events = useMemo(() => baseEvents.map((e) => (paidIds.includes(e.id) ? { ...e, paid: true } : e)), [baseEvents, paidIds]);
  const reminders = useMemo(() => dueReminders(events).filter((r) => !snoozed.includes(r.event.id)), [events, snoozed]);
  const monthEvents = useMemo(() => eventsInMonth(events, cursor.year, cursor.month), [events, cursor]);
  const { paid, remaining } = splitPaid(monthEvents);
  const total = paid + remaining;
  const openEvents = openDate ? eventsOnDay(events, openDate) : [];
  const unpaid = monthEvents.filter((e) => !e.paid).sort((a, b) => a.date.localeCompare(b.date));

  const byDay = useMemo(() => {
    const map = new Map<string, PaymentEvent[]>();
    for (const e of monthEvents) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return map;
  }, [monthEvents]);

  const alerts = bills.filter((b) => b.houseId === house.id && b.status === "red_flag").length;

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const index = c.year * 12 + (c.month - 1) + delta;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });
  }

  const blanks = Array.from({ length: weekdayIndex(cursor.year, cursor.month) });
  const days = Array.from({ length: monthDays(cursor.year, cursor.month) }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-4">
      {alerts > 0 && (
        <Link href="/facturi" className="flex items-center justify-between rounded-2xl bg-alert-bg px-4 py-3 text-sm font-semibold text-alert">
          <span>🚨 Ai {alerts} {alerts === 1 ? "factură suspectă" : "facturi suspecte"} · {FAMILY_NAME}</span>
          <span aria-hidden>→</span>
        </Link>
      )}

      {reminders.length > 0 && (
        <section className="rounded-card bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Remindere</p>
            <span className="text-[11px] font-semibold text-muted">7 zile · 3 zile · ziua scadenței</span>
          </div>
          <ul className="flex flex-col divide-y divide-line">
            {reminders.map((r) => (
              <li key={r.event.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar event={r.event} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{r.event.title}</p>
                      <p className={`text-xs font-bold ${r.overdue || r.daysLeft === 0 ? "text-alert" : "text-muted"}`}>{reminderLabel(r.daysLeft)}</p>
                    </div>
                  </div>
                  <span className="shrink-0 font-bold text-ink">{fmtRon(r.event.amount)}</span>
                </div>
                <div className="flex gap-2 pl-[52px]">
                  <button onClick={() => setPaidIds((ids) => [...ids, r.event.id])} className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
                    Marchează plătit
                  </button>
                  <button onClick={() => setSnoozed((ids) => [...ids, r.event.id])} className="rounded-full bg-app px-3 py-1 text-xs font-semibold text-ink">
                    Amână
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-card bg-white p-2 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <Link href="/statistici" aria-label="Statistici" className="grid size-10 shrink-0 place-items-center rounded-full bg-app text-ink">
            <BarChart3 size={18} />
          </Link>
          <div className="min-w-0 text-center">
            <p className="truncate text-lg font-extrabold text-ink">
              {MONTHS[cursor.month - 1]}, {cursor.year}
            </p>
            <p className="text-sm font-semibold text-muted">
              {fmtRon(total)} <span className="font-normal">({fmtRon(remaining)} rămas)</span>
            </p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => shiftMonth(-1)} aria-label="Luna anterioară" className="grid size-9 place-items-center rounded-full bg-app text-ink">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => shiftMonth(1)} aria-label="Luna următoare" className="grid size-9 place-items-center rounded-full bg-app text-ink">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-x-0.5 gap-y-1">
          {WEEKDAYS.map((d) => (
            <span key={d} className="rounded-full bg-app py-1.5 text-center text-xs font-semibold text-muted">
              {d}
            </span>
          ))}
          {blanks.map((_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const date = toIso(cursor.year, cursor.month, day);
            const dayEvents = byDay.get(date) ?? [];
            const isToday = date === DEMO_TODAY;
            return (
              <button
                key={date}
                onClick={() => setOpenDate(date)}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl p-0.5 text-base font-bold transition hover:bg-app ${
                  isToday ? "ring-2 ring-pago-blue text-pago-blue" : "text-ink"
                }`}
              >
                <span>{day}</span>
                {dayEvents.length > 0 && (
                  <span className={`grid w-full place-items-center gap-0.5 ${dayEvents.length === 1 ? "" : "grid-cols-2"}`}>
                    {dayEvents.slice(0, dayEvents.length > 4 ? 3 : 4).map((e) => (
                      <Avatar key={e.id} event={e} />
                    ))}
                    {dayEvents.length > 4 && <span className="grid size-6 place-items-center rounded-md bg-app text-[10px] font-bold text-muted">+{dayEvents.length - 3}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-card bg-white p-4 shadow-card">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">De plătit în {MONTHS[cursor.month - 1].toLowerCase()}</p>
        {unpaid.length === 0 ? (
          <p className="text-sm text-muted">Ai plătit tot în această lună.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {unpaid.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar event={e} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{e.title}</p>
                    <p className="text-xs text-muted">
                      {CATEGORY_META[e.category].label} · {new Date(e.date).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-bold text-ink">{fmtRon(e.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {openDate && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 p-6" onClick={() => setOpenDate(null)}>
          <div className="w-full max-w-[360px] rounded-card bg-white p-5 shadow-float" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-extrabold text-ink">
                {(() => {
                  const [, m, d] = openDate.split("-").map(Number);
                  return `${d} ${MONTHS[m - 1].toLowerCase()}`;
                })()}
              </p>
              <button onClick={() => setOpenDate(null)} aria-label="Închide" className="grid size-8 place-items-center rounded-full bg-app text-ink">
                <X size={16} />
              </button>
            </div>
            {openEvents.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Nicio plată în această zi.</p>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-line">
                {openEvents.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar event={e} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{e.title}</p>
                        <p className={`text-xs font-semibold ${e.paid ? "text-success" : "text-muted"}`}>{e.paid ? "Plătit" : "De plătit"}</p>
                      </div>
                    </div>
                    <span className="shrink-0 font-bold text-ink">{fmtRon(e.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="text-sm font-semibold text-muted">Total</span>
              <span className="font-extrabold text-ink">{fmtRon(openEvents.reduce((s, e) => s + e.amount, 0))}</span>
            </div>
            <button onClick={() => setOpenDate(null)} className="btn-dark mt-4 w-full">
              Închide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
