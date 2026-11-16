"use client";

import Link from "next/link";
import { CalendarClock, PiggyBank, ReceiptText, Users } from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { FAMILY_NAME, poolGoal } from "@/data/mockFamilyData";
import { fmtRon } from "@/lib/disputes";

export function HomeScreen() {
  const { house, houseBills, tickets, points } = useFamily();

  const toPay = houseBills.reduce((sum, b) => {
    if (b.status === "platita" || b.status === "platita_partial") return sum;
    return sum + b.amount;
  }, 0);
  const frozen = tickets.filter((t) => t.houseId === house.id).reduce((s, t) => s + t.disputedAmount, 0);
  const alerts = houseBills.filter((b) => b.status === "red_flag").length;
  const progress = Math.min(100, Math.round((points / poolGoal.target) * 100));

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-hero bg-hero p-5 pb-6 text-white shadow-card">
        <p className="text-sm font-medium text-white/80">Bună,</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{FAMILY_NAME}</h1>

        {alerts > 0 && (
          <Link href="/facturi" className="glass mt-4 flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-white">
            <span>🚨 Ai {alerts} {alerts === 1 ? "factură suspectă" : "facturi suspecte"}</span>
            <span aria-hidden>→</span>
          </Link>
        )}
      </section>

      <section className="rounded-card bg-white p-5 shadow-card">
        <p className="text-sm font-medium text-muted">De plătit luna asta · {house.name}</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">{fmtRon(toPay)}</p>
        {frozen > 0 && <p className="mt-2 text-sm text-muted">❄️ {fmtRon(frozen)} înghețați până la factura storno</p>}
        <Link href="/facturi" className="btn-dark mt-5 w-full">
          Vezi facturile
        </Link>
      </section>

      <nav className="grid grid-cols-3 gap-3" aria-label="Acțiuni rapide">
        <QuickAction href="/facturi" label="Facturi" Icon={ReceiptText} />
        <QuickAction href="/radar" label="Abonamente" Icon={CalendarClock} />
        <QuickAction href="/familie" label="Familie" Icon={Users} />
      </nav>

      <section className="bg-card-gradient rounded-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-white/20">
            <PiggyBank size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Pușculița familiei</p>
            <p className="font-bold">
              {points.toLocaleString("ro-RO")} / {poolGoal.target.toLocaleString("ro-RO")} pct
            </p>
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-xs text-white/85">{poolGoal.label}</p>
      </section>
    </div>
  );
}

function QuickAction({ href, label, Icon }: { href: string; label: string; Icon: typeof ReceiptText }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 rounded-card bg-white px-2 py-4 text-center text-xs font-semibold text-ink shadow-card">
      <span className="grid size-10 place-items-center rounded-full bg-blue-50 text-pago-blue">
        <Icon size={20} />
      </span>
      {label}
    </Link>
  );
}
