"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Lightbulb, Repeat, Wallet } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { useFamily } from "@/context/FamilyContext";
import { fmtRon } from "@/lib/disputes";
import { MONTHS, plural } from "@/lib/format";
import { buildInsights, type InsightTone } from "@/lib/insights";
import { CATEGORIES, CATEGORY_META, buildEvents, eventsInMonth, summarizeYear, type PaymentCategory } from "@/lib/payments";

const MONTH_LETTERS = ["I", "F", "M", "A", "M", "I", "I", "A", "S", "O", "N", "D"];

const CATEGORY_COLOR: Record<PaymentCategory, string> = {
  utilitati: "var(--color-cat-blue)",
  abonamente: "var(--color-cat-red)",
  asigurari: "var(--color-cat-green)",
  servicii: "var(--color-cat-amber)",
};

const INSIGHT_TONE: Record<InsightTone, string> = {
  info: "bg-surface-2 text-pago-blue",
  warning: "bg-warning-bg text-warning",
  success: "bg-success-bg text-success",
};

const CX = 150;
const CY = 150;
const R = 110;

function polar(i: number, n: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
}

function Donut({ values, selected, onSelect }: { values: number[]; selected: number; onSelect: (i: number) => void }) {
  const total = values.reduce((s, v) => s + v, 0) || 1;
  const radius = 92;
  const circ = 2 * Math.PI * radius;
  const segments = values.reduce<{ len: number; start: number }[]>((acc, v) => {
    const prev = acc.length ? acc[acc.length - 1] : { len: 0, start: 0 };
    return [...acc, { len: (v / total) * circ, start: prev.start + prev.len }];
  }, []);
  return (
    <svg viewBox="0 0 300 300" className="mx-auto size-64" role="img" aria-label="Cheltuieli pe categorii">
      <circle cx={CX} cy={CY} r={radius + 18} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} className="text-ink" />
      <g transform={`rotate(-90 ${CX} ${CY})`}>
        {segments.map(({ len, start }, i) => (
          <circle
            key={CATEGORIES[i]}
            cx={CX}
            cy={CY}
            r={radius}
            fill="none"
            stroke={CATEGORY_COLOR[CATEGORIES[i]]}
            strokeWidth={selected === i ? 30 : 22}
            strokeDasharray={`${Math.max(0, len - 3)} ${circ}`}
            strokeDashoffset={-start}
            className="cursor-pointer transition-all"
            onClick={() => onSelect(i)}
            onMouseEnter={() => onSelect(i)}
          />
        ))}
      </g>
      <text x={CX} y={CY - 14} textAnchor="middle" fontSize={15} fontWeight={800} className="fill-ink">
        {CATEGORY_META[CATEGORIES[selected]].label}
      </text>
      <text x={CX} y={CY + 10} textAnchor="middle" fontSize={13} fontWeight={600} className="fill-muted">
        {fmtRon(Math.round(values[selected] ?? 0))} · {Math.round(((values[selected] ?? 0) / total) * 100)}%
      </text>
    </svg>
  );
}

function Radar({ values, active, onHover }: { values: number[]; active: number | null; onHover: (i: number | null) => void }) {
  const n = values.length;
  const max = Math.max(1, ...values);
  const shape = values.map((v, i) => polar(i, n, (v / max) * R).join(",")).join(" ");
  return (
    <svg viewBox="0 0 300 300" className="mx-auto h-72 w-full max-w-[300px]" role="img" aria-label="Cheltuieli pe lunile anului">
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <circle key={r} cx={CX} cy={CY} r={R * r} fill="none" stroke="currentColor" strokeOpacity={0.12} className="text-ink" />
      ))}
      {values.map((_, i) => {
        const [x, y] = polar(i, n, R);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.12} className="text-ink" />;
      })}
      <polygon points={shape} fill="var(--color-pago-blue)" fillOpacity={0.18} stroke="var(--color-pago-blue)" strokeWidth={2.5} strokeLinejoin="round" />
      {values.map((v, i) => {
        const [x, y] = polar(i, n, (v / max) * R);
        return (
          <g key={i} onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)} onClick={() => onHover(active === i ? null : i)} className="cursor-pointer">
            <circle cx={x} cy={y} r={14} fill="transparent" />
            <circle cx={x} cy={y} r={active === i ? 8 : 4.5} fill={active === i ? "var(--color-family-coral)" : "var(--color-pago-blue)"} />
          </g>
        );
      })}
      {MONTH_LETTERS.map((label, i) => {
        const [x, y] = polar(i, n, R + 16);
        return (
          <text key={`${label}-${i}`} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={600} className="fill-muted">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export function StatsScreen() {
  const { house, ledger, houseSubscriptions, settings, today } = useFamily();
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const years = [todayYear - 1, todayYear, todayYear + 1];
  const [year, setYear] = useState(todayYear);
  const [mode, setMode] = useState<"year" | "category">("year");
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);

  const events = buildEvents(ledger, house.id, year, today);
  const summary = summarizeYear(events, year);
  const monthItems = activeMonth === null ? [] : eventsInMonth(events, year, activeMonth + 1);
  const insights = year === todayYear ? buildInsights({ events, subscriptions: houseSubscriptions, year, month: todayMonth, budget: settings.monthlyBudget }) : [];
  const budget = settings.monthlyBudget;
  const monthTotal = eventsInMonth(events, year, todayMonth).reduce((sum, e) => sum + e.amount, 0);
  const budgetShare = budget ? Math.min(100, Math.round((monthTotal / budget) * 100)) : 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Statistici · ${house.name}`} back="/" />

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold text-ink">Statistici</h2>
              <select
                value={year}
                onChange={(e) => {
                  setYear(Number(e.target.value));
                  setActiveMonth(null);
                }}
                className="min-h-9 rounded-full bg-surface-2 px-3 text-sm font-bold text-ink outline-none"
                aria-label="Alege anul"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-sm text-muted">
              {summary.items.length === 0 ? `Nicio plată în ${year}` : `${plural(summary.items.length, "plată recurentă", "plăți recurente")} în ${year}`}
            </p>
          </div>
          <div className="flex rounded-full bg-surface-2 p-1 text-xs font-semibold">
            <button onClick={() => setMode("year")} aria-pressed={mode === "year"} className={`min-h-9 rounded-full px-3 ${mode === "year" ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
              An
            </button>
            <button onClick={() => setMode("category")} aria-pressed={mode === "category"} className={`min-h-9 rounded-full px-3 ${mode === "category" ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
              Categorie
            </button>
          </div>
        </div>

        <div className="relative mt-4">
          {mode === "year" ? (
            <>
              <Radar values={summary.byMonth} active={activeMonth} onHover={setActiveMonth} />
              {activeMonth !== null && (
                <div className="pointer-events-none absolute left-1/2 top-2 w-48 -translate-x-1/2 rounded-2xl bg-ink p-3 text-xs text-white shadow-float">
                  <p className="font-bold">{MONTHS[activeMonth]}</p>
                  <p className="text-sm font-extrabold">{fmtRon(Math.round(summary.byMonth[activeMonth]))}</p>
                  {monthItems.slice(0, 3).map((e) => (
                    <p key={e.id} className="truncate text-white/80">
                      {e.title} · {fmtRon(e.amount)}
                    </p>
                  ))}
                  {monthItems.length > 3 && <p className="text-white/60">și încă {monthItems.length - 3}</p>}
                </div>
              )}
            </>
          ) : (
            <>
              <Donut values={CATEGORIES.map((c) => summary.byCategory[c])} selected={activeCategory} onSelect={setActiveCategory} />
              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2">
                {CATEGORIES.map((c, i) => (
                  <button key={c} onClick={() => setActiveCategory(i)} aria-pressed={activeCategory === i} className="flex min-h-9 items-center gap-1.5 text-xs font-semibold text-muted">
                    <span className={`size-2.5 rounded-full ${CATEGORY_META[c].dot}`} />
                    {CATEGORY_META[c].label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
              <Wallet size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-ink">{fmtRon(Math.round(summary.total))}</p>
              <p className="text-xs text-muted">Plată anuală estimată</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
              <Repeat size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-ink">{fmtRon(Math.round(summary.averageMonthly))}</p>
              <p className="text-xs text-muted">Cost mediu lunar</p>
            </div>
          </div>
        </div>
      </Card>

      {year === todayYear && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-ink">Bugetul lunii {MONTHS[todayMonth - 1].toLowerCase()}</p>
            <Link href="/profil/setari" className="min-h-9 text-sm font-semibold leading-9 text-pago-blue">
              {budget ? "Modifică" : "Setează"}
            </Link>
          </div>
          {budget ? (
            <>
              <p className="mt-1 text-sm text-muted">
                {fmtRon(Math.round(monthTotal))} din {fmtRon(budget)}
              </p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${budgetShare}% din buget`}>
                <div className={`h-full rounded-full ${monthTotal > budget ? "bg-alert" : "bg-pago-blue"}`} style={{ width: `${budgetShare}%` }} />
              </div>
              <p className={`mt-2 text-xs font-semibold ${monthTotal > budget ? "text-alert" : "text-success"}`}>
                {monthTotal > budget ? `Peste buget cu ${fmtRon(Math.round(monthTotal - budget))}` : `Mai ai ${fmtRon(Math.round(budget - monthTotal))} până la limită`}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">Setează un buget lunar și te anunțăm când plățile îl depășesc.</p>
          )}
        </Card>
      )}

      {insights.length > 0 && (
        <Card>
          <p className="mb-3 flex items-center gap-2 font-bold text-ink">
            <Lightbulb size={18} className="text-family-coral" /> Ce am observat
          </p>
          <ul className="flex flex-col gap-2">
            {insights.map((insight) => {
              const body = (
                <>
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${INSIGHT_TONE[insight.tone]}`}>{insight.tone === "warning" ? "!" : insight.tone === "success" ? "✓" : "i"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug text-ink">{insight.title}</span>
                    <span className="block text-xs leading-relaxed text-muted">{insight.text}</span>
                  </span>
                  {insight.href && <ChevronRight size={18} className="shrink-0 text-muted" />}
                </>
              );
              return (
                <li key={insight.id}>
                  {insight.href ? (
                    <Link href={insight.href} className="flex items-center gap-3 rounded-2xl bg-surface-2/60 p-3">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl bg-surface-2/60 p-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Plăți în {year}</h2>
        {summary.items.length === 0 ? (
          <p className="text-sm text-muted">Nicio plată înregistrată în acest an.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {summary.items.map((item) => (
              <li key={item.name} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{item.name}</p>
                  <p className={`mt-0.5 text-xs font-semibold ${CATEGORY_META[item.category].text}`}>
                    {CATEGORY_META[item.category].label} · {plural(item.count, "plată", "plăți")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-ink">{fmtRon(Math.round(item.total))}</p>
                  <p className="text-xs font-semibold text-muted">≈ {fmtRon(Math.round(item.averageMonthly))}/lună</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
