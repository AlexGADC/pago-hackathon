"use client";

// TAB 2 — Facturi & Pago AI Bodyguard. Schelet: lista cu badge-uri e legată la context.
// TODO (frontend): BillDetail + DisputeFlowA (poză/manual) + DisputeFlowB (1 tap) + TicketTracker.

import { Card, SectionTitle } from "@/components/shared/Card";
import { useFamily } from "@/context/FamilyContext";
import { fmtRon, percentOverAverage } from "@/lib/disputes";
import type { BillStatus } from "@/types/pago";

const BADGE: Record<BillStatus, { label: string; cls: string }> = {
  normala: { label: "✅ Normală", cls: "bg-success-bg text-success" },
  red_flag: { label: "🚨 Red Flag", cls: "bg-alert-bg text-alert" },
  contestata: { label: "📨 Contestată", cls: "bg-family-indigo/10 text-family-indigo" },
  platita_partial: { label: "🧊 Plătită parțial", cls: "bg-family-indigo/10 text-family-indigo" },
  platita: { label: "✔️ Plătită", cls: "bg-slate-100 text-slate-500" },
};

export function BillsScreen() {
  const { house, houseBills } = useFamily();

  return (
    <div>
      <SectionTitle>Facturi · {house.name}</SectionTitle>
      <div className="flex flex-col gap-3">
        {houseBills.map((b) => (
          <Card key={b.id} className={b.status === "red_flag" ? "border-alert/40" : ""}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">{b.provider}</p>
                <p className="text-xs text-slate-500">Scadentă {new Date(b.dueDate).toLocaleDateString("ro-RO")}</p>
              </div>
              <p className="shrink-0 text-lg font-extrabold">{fmtRon(b.amount)}</p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[b.status].cls}`}>{BADGE[b.status].label}</span>
              {b.status === "red_flag" && <span className="text-xs font-semibold text-alert">+{percentOverAverage(b)}% față de media ta ({fmtRon(b.averageAmount)})</span>}
            </div>
            {b.anomaly && b.status === "red_flag" && <p className="mt-2 text-sm text-slate-600">{b.anomaly.reason}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
