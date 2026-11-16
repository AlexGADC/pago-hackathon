"use client";

import { useFamily } from "@/context/FamilyContext";
import { subscriptions } from "@/data/mockFamilyData";
import { Card, SectionTitle, Tag } from "@/components/shared/Card";
import { daysUntil, fmtRon } from "@/lib/disputes";

export function SubscriptionsScreen() {
  const { activeHouse, house } = useFamily();
  const subs = subscriptions.filter((s) => s.houseId === activeHouse);
  const monthly = subs.reduce((s, x) => s + x.monthlyPrice, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="pt-2 text-xl font-bold text-ink">Abonamente · {house.name}</h1>

      <Card>
        <p className="text-sm font-medium text-muted">Total pe lună</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{fmtRon(monthly)}</p>
        <p className="mt-1 text-sm text-muted">≈ {fmtRon(monthly * 12)} pe an · {subs.length} abonamente</p>
      </Card>

      <SectionTitle>Lista abonamentelor</SectionTitle>
      <Card className="flex flex-col divide-y divide-line">
        {subs.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="font-semibold text-ink">{s.name}</p>
              <p className="text-xs text-muted">{s.billing === "yearly" ? "Plată anuală" : "Plată lunară"} · se reînnoiește în {daysUntil(s.renewsOn)} zile</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {s.trialEndsOn && <Tag tone="indigo">Trial până în {daysUntil(s.trialEndsOn)} zile</Tag>}
                {s.previousPrice && <Tag tone="red">Scumpit de la {fmtRon(s.previousPrice)}</Tag>}
              </div>
            </div>
            <span className="shrink-0 text-right font-bold text-ink">{s.billing === "yearly" ? `${fmtRon(s.monthlyPrice * 12)}/an` : `${fmtRon(s.monthlyPrice)}/lună`}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
