"use client";

// TAB 4 — Radar & Scut. Schelet legat la context.
// TODO (frontend): alerte vizuale, „Reînnoiește în 2 click-uri”.

import { Card, SectionTitle } from "@/components/shared/Card";
import { useFamily } from "@/context/FamilyContext";
import { expiries, subscriptions } from "@/data/mockFamilyData";
import { daysUntil, fmtRon } from "@/lib/disputes";

export function RadarScreen() {
  const { activeHouse } = useFamily();
  const subs = subscriptions.filter((s) => s.houseId === activeHouse);
  const exps = expiries.filter((e) => e.houseId === activeHouse);

  // Radar: expirările auto (RCA, Rovinietă, ITP) + reînnoirile abonamentelor (Netflix, Disney+ etc.), sortate după zile rămase.
  const radarItems = [
    ...exps.map((e) => ({ id: e.id, kind: e.kind, title: e.vehicle, date: e.expiresOn })),
    ...subs.map((s) => ({
      id: `radar-${s.id}`,
      kind: s.trialEndsOn ? "Free Trial" : "Reînnoire",
      title: s.name,
      date: s.trialEndsOn ?? s.renewsOn,
    })),
  ].sort((a, b) => daysUntil(a.date) - daysUntil(b.date));

  return (
    <div>
      <SectionTitle>SubKill · Abonamente</SectionTitle>
      <Card className="flex flex-col divide-y divide-card-border">
        {subs.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="font-semibold">{s.name}</p>
              {s.previousPrice && <p className="text-xs font-semibold text-alert">S-a scumpit de la {fmtRon(s.previousPrice)}</p>}
              {s.trialEndsOn && <p className="text-xs font-semibold text-family-coral">Free Trial expiră în {daysUntil(s.trialEndsOn)} zile</p>}
            </div>
            <span className="shrink-0 text-sm font-bold">{fmtRon(s.monthlyPrice)}/lună</span>
          </div>
        ))}
      </Card>

      <SectionTitle>Radar expirări & reînnoiri</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {radarItems.map((r) => {
          const d = daysUntil(r.date);
          return (
            <Card key={r.id} className={d <= 14 ? "border-alert/40 bg-alert-bg" : ""}>
              <p className="text-xs font-bold text-slate-500">{r.kind}</p>
              <p className={`text-2xl font-extrabold ${d <= 14 ? "text-alert" : ""}`}>{d} zile</p>
              <p className="text-xs text-slate-500">{r.title}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
