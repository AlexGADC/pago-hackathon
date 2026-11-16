"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Repeat, Wallet } from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { CATEGORY_META, buildEvents, summarizeYear, type PaymentCategory } from "@/lib/payments";
import { fmtRon } from "@/lib/disputes";
import { Card } from "@/components/shared/Card";

const YEARS = [2025, 2026, 2027];
const MONTH_LETTERS = ["I", "F", "M", "A", "M", "I", "I", "A", "S", "O", "N", "D"];
const MONTH_NAMES = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
const CATEGORIES: PaymentCategory[] = ["utilitati", "abonamente", "asigurari"];
const HEX: Record<PaymentCategory, string> = { utilitati: "#4c8df6", abonamente: "#ff5d73", asigurari: "#20c997" };

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
    acc.push({ len: (v / total) * circ, start: prev.start + prev.len });
    return acc;
  }, []);
  return (
    <svg viewBox="0 0 300 300" className="mx-auto size-64" role="img" aria-label="Diagramă pe categorii">
      <circle cx={CX} cy={CY} r={radius + 18} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} className="text-ink" />
      <g transform={`rotate(-90 ${CX} ${CY})`}>
        {segments.map(({ len, start }, i) => (
            <circle
              key={CATEGORIES[i]}
              cx={CX}
              cy={CY}
              r={radius}
              fill="none"
              stroke={HEX[CATEGORIES[i]]}
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
        {fmtRon(values[selected] ?? 0)} · {Math.round(((values[selected] ?? 0) / total) * 100)}%
      </text>
    </svg>
  );
}

function Radar({ values, active, onHover }: { values: number[]; active: number | null; onHover: (i: number | null) => void }) {
  const n = values.length;
  const max = Math.max(1, ...values);
  const shape = values.map((v, i) => polar(i, n, (v / max) * R).join(",")).join(" ");
  return (
    <svg viewBox="0 0 300 300" className="mx-auto h-72 w-full max-w-[300px]" role="img" aria-label="Diagramă radar pe luni">
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <circle key={r} cx={CX} cy={CY} r={R * r} fill="none" stroke="currentColor" strokeOpacity={0.12} className="text-ink" />
      ))}
      {values.map((_, i) => {
        const [x, y] = polar(i, n, R);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.12} className="text-ink" />;
      })}
      <polygon points={shape} fill="#0066FF" fillOpacity={0.18} stroke="#0066FF" strokeWidth={2.5} strokeLinejoin="round" />
      {values.map((v, i) => {
        const [x, y] = polar(i, n, (v / max) * R);
        return (
          <g key={i} onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)} onClick={() => onHover(i)} className="cursor-pointer">
            <circle cx={x} cy={y} r={active === i ? 8 : 4.5} fill={active === i ? "#FFD54A" : "#0066FF"} />
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
  const { house } = useFamily();
  const [year, setYear] = useState(2026);
  const [mode, setMode] = useState<"year" | "category">("year");
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const events = useMemo(() => buildEvents(house.id, year), [house.id, year]);
  const summary = useMemo(() => summarizeYear(events, year), [events, year]);

  const monthItems = activeMonth === null ? [] : events.filter((e) => e.date.startsWith(`${year}-${String(activeMonth + 1).padStart(2, "0")}`));

  return (
    <div className="flex flex-col gap-4 pt-2">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Înapoi la acasă" className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-ink">Statistici · {house.name}</h1>
      </header>

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
                className="rounded-full bg-surface-2 px-3 py-1 text-sm font-bold text-ink outline-none"
                aria-label="Alege anul"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-sm text-muted">
              Ai {summary.items.length} {summary.items.length === 1 ? "plată activă" : "plăți active"} în {year}
            </p>
          </div>
          <div className="flex rounded-full bg-surface-2 p-1 text-xs font-semibold">
            <button onClick={() => setMode("year")} className={`rounded-full px-3 py-1.5 ${mode === "year" ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
              An
            </button>
            <button onClick={() => setMode("category")} className={`rounded-full px-3 py-1.5 ${mode === "category" ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
              Categorie
            </button>
          </div>
        </div>

        <div className="relative mt-4">
          {mode === "year" ? (
            <>
              <Radar values={summary.byMonth} active={activeMonth} onHover={setActiveMonth} />
              {activeMonth !== null && (
                <div className="absolute left-1/2 top-2 w-44 -translate-x-1/2 rounded-2xl bg-ink p-3 text-xs text-white shadow-float">
                  <p className="font-bold">{MONTH_NAMES[activeMonth]}</p>
                  <p className="text-sm font-extrabold">{fmtRon(summary.byMonth[activeMonth])}</p>
                  {monthItems.slice(0, 3).map((e) => (
                    <p key={e.id} className="truncate text-white/80">
                      {e.title} · {fmtRon(e.amount)}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Donut values={CATEGORIES.map((c) => summary.byCategory[c])} selected={activeCategory} onSelect={setActiveCategory} />
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
              <Wallet size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-ink">{fmtRon(summary.total)}</p>
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
                    {CATEGORY_META[item.category].label} · {item.count} {item.count === 1 ? "plată" : "plăți"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-ink">{fmtRon(item.total)}</p>
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
