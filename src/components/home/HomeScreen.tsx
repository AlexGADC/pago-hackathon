"use client";

// TAB 1 — Acasă. Schelet: datele sunt legate la FamilyContext; designul final e TODO (frontend).

import { AlertTriangle, CheckCircle2, PiggyBank } from "lucide-react";
import { Card, SectionTitle } from "@/components/shared/Card";
import { useFamily } from "@/context/FamilyContext";
import { poolGoal } from "@/data/mockFamilyData";
import { fmtRon } from "@/lib/disputes";

export function HomeScreen() {
  const { house, houseBills, tickets, points } = useFamily();

  const toPay = houseBills.reduce((sum, b) => {
    if (b.status === "platita") return sum;
    if (b.status === "platita_partial") return sum; // diferența e înghețată, suma corectă a fost plătită
    return sum + b.amount;
  }, 0);
  const frozen = tickets.filter((t) => t.houseId === house.id).reduce((s, t) => s + t.disputedAmount, 0);
  const alerts = houseBills.filter((b) => b.status === "red_flag").length;
  const progress = Math.min(100, Math.round((points / poolGoal.target) * 100));

  return (
    <div>
      <SectionTitle>Sănătatea lunară a bugetului</SectionTitle>
      <Card className={alerts ? "border-alert/40 bg-alert-bg" : ""}>
        <p className="text-sm text-slate-500">De plată luna asta · {house.name}</p>
        <p className="text-3xl font-extrabold">{fmtRon(toPay)}</p>
        {frozen > 0 && <p className="mt-1 text-sm text-slate-600">❄️ {fmtRon(frozen)} înghețați până la stornare</p>}
        <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${alerts ? "text-alert" : "text-success"}`}>
          {alerts ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          {alerts ? `${alerts} ${alerts === 1 ? "factură suspectă" : "facturi suspecte"}` : "Totul arată normal"}
        </p>
      </Card>

      <SectionTitle>Family Points Pool</SectionTitle>
      <Card>
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-family-coral/10 text-family-coral">
            <PiggyBank size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold">
              {points.toLocaleString("ro-RO")} / {poolGoal.target.toLocaleString("ro-RO")} pct
            </p>
            <p className="text-xs text-slate-500">{poolGoal.label}</p>
          </div>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-family-coral transition-all" style={{ width: `${progress}%` }} />
        </div>
      </Card>

      {/* TODO (frontend): Acțiuni rapide — Plătește tot ce e validat · Scanează contor · Split link */}
    </div>
  );
}
