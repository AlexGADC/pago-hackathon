"use client";

import { useFamily } from "@/context/FamilyContext";
import { expiries } from "@/data/mockFamilyData";
import { Card, SectionTitle } from "@/components/shared/Card";
import { daysUntil, fmtRon } from "@/lib/disputes";

export function InsuranceScreen() {
  const { activeHouse, house } = useFamily();
  const items = expiries.filter((e) => e.houseId === activeHouse);
  const yearly = items.reduce((s, e) => s + e.price, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="pt-2 text-xl font-bold text-ink">Asigurări · {house.name}</h1>

      <Card>
        <p className="text-sm font-medium text-muted">Cost anual total</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{fmtRon(yearly)}</p>
        <p className="mt-1 text-sm text-muted">≈ {fmtRon(Math.round(yearly / 12))}/lună</p>
      </Card>

      <SectionTitle>Expirări</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {items.map((e) => {
          const d = daysUntil(e.expiresOn);
          const soon = d <= 14;
          return (
            <Card key={e.id} className={soon ? "border-alert/40 bg-alert-bg" : ""}>
              <p className="text-xs font-bold text-muted">{e.kind}</p>
              <p className={`mt-1 text-2xl font-extrabold ${soon ? "text-alert" : "text-ink"}`}>{d} zile</p>
              <p className="mt-1 text-xs text-muted">{e.vehicle}</p>
              <p className="mt-2 text-sm font-bold text-ink">{fmtRon(e.price)}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
