"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, PiggyBank, Plus, Repeat, Zap } from "lucide-react";
import { BrandBadge } from "@/components/shared/Badges";
import { Card, SectionTitle, Tag } from "@/components/shared/Card";
import { EmptyState, Segmented } from "@/components/shared/Controls";
import { ScreenTitle } from "@/components/shared/PageHeader";
import { useFamily } from "@/context/FamilyContext";
import { CYCLE_LABEL, CYCLE_SUFFIX } from "@/data/catalog";
import { activeRule } from "@/lib/autopay";
import { daysUntil, fmtRon } from "@/lib/disputes";
import { fmtDay, plural } from "@/lib/format";
import { reminderLabel } from "@/lib/reminders";
import { isUnused, nextRenewal, potentialSavings, priceIncrease, totalMonthly, totalYearly, trialDaysLeft } from "@/lib/subscriptions";
import type { Subscription } from "@/types/pago";

const PERIODS = [
  { value: "monthly" as const, label: "Pe lună" },
  { value: "yearly" as const, label: "Pe an" },
];

export function SubscriptionsScreen() {
  const { house, houseSubscriptions, today } = useFamily();
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  const withNext = houseSubscriptions.map((sub) => ({ sub, next: nextRenewal(sub, today) }));
  const active = withNext.filter((x) => x.sub.status === "activ").sort((a, b) => (a.next ?? "9999").localeCompare(b.next ?? "9999"));
  const paused = withNext.filter((x) => x.sub.status === "pauza");
  const canceled = withNext.filter((x) => x.sub.status === "anulat");
  const total = period === "monthly" ? totalMonthly(houseSubscriptions) : totalYearly(houseSubscriptions);
  const savings = potentialSavings(houseSubscriptions);
  const unusedCount = houseSubscriptions.filter(isUnused).length;

  return (
    <div className="flex flex-col gap-3">
      <ScreenTitle
        title={`Abonamente · ${house.name}`}
        action={
          <Link href="/abonamente/nou" className="pill pill-primary shrink-0">
            <Plus size={14} /> Adaugă
          </Link>
        }
      />

      {houseSubscriptions.length === 0 ? (
        <EmptyState icon={Repeat} title="Niciun abonament încă" text="Adaugă abonamentele casei ca să vezi cât te costă pe lună și pe an, și ca să primești alerte la scumpiri sau la finalul perioadelor de probă.">
          <Link href="/abonamente/nou" className="btn-dark w-full text-sm">
            <Plus size={16} /> Adaugă primul abonament
          </Link>
        </EmptyState>
      ) : (
        <>
          <Card>
            <Segmented value={period} onChange={setPeriod} options={PERIODS} label="Perioada totalului" />
            <p className="mt-4 text-sm font-medium text-muted">{period === "monthly" ? "Total pe lună" : "Total pe an"}</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{fmtRon(Math.round(total * 100) / 100)}</p>
            <p className="mt-1 text-sm text-muted">
              {plural(active.length, "abonament activ", "abonamente active")}
              {period === "monthly" ? " · plățile anuale sunt împărțite pe luni" : " · inclusiv plățile anuale și trimestriale"}
            </p>
          </Card>

          {savings > 0 && (
            <div className="flex items-start gap-3 rounded-card bg-success-bg p-4">
              <PiggyBank size={20} className="mt-0.5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-bold text-ink">Poți economisi {fmtRon(Math.round(savings))} pe an</p>
                <p className="text-xs text-muted">
                  {unusedCount === 1
                    ? "Un abonament nu a mai fost folosit de peste două luni. Pune-l pe pauză sau anulează-l."
                    : `${unusedCount} abonamente nu au mai fost folosite de peste două luni. Pune-le pe pauză sau anulează-le.`}
                </p>
              </div>
            </div>
          )}

          {active.length > 0 && (
            <>
              <SectionTitle>Active ({active.length})</SectionTitle>
              <Card className="flex flex-col divide-y divide-line">
                {active.map(({ sub, next }) => (
                  <SubscriptionRow key={sub.id} sub={sub} next={next} />
                ))}
              </Card>
            </>
          )}

          {paused.length > 0 && (
            <>
              <SectionTitle>În pauză ({paused.length})</SectionTitle>
              <Card className="flex flex-col divide-y divide-line">
                {paused.map(({ sub, next }) => (
                  <SubscriptionRow key={sub.id} sub={sub} next={next} />
                ))}
              </Card>
            </>
          )}

          {canceled.length > 0 && (
            <>
              <SectionTitle>Anulate ({canceled.length})</SectionTitle>
              <Card className="flex flex-col divide-y divide-line">
                {canceled.map(({ sub, next }) => (
                  <SubscriptionRow key={sub.id} sub={sub} next={next} />
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SubscriptionRow({ sub, next }: { sub: Subscription; next: string | null }) {
  const { autopay, today } = useFamily();
  const trial = trialDaysLeft(sub, today);
  const increase = priceIncrease(sub);
  const automatic = Boolean(activeRule(autopay, sub.id));

  const detail =
    sub.status === "pauza"
      ? `În pauză din ${fmtDay(sub.statusChangedOn ?? today)}`
      : sub.status === "anulat"
        ? `Anulat pe ${fmtDay(sub.statusChangedOn ?? today)}`
        : next
          ? `${CYCLE_LABEL[sub.cycle]} · ${reminderLabel(daysUntil(next, today)).toLowerCase()} (${fmtDay(next)})`
          : CYCLE_LABEL[sub.cycle];

  return (
    <Link href={`/abonamente/${sub.id}`} className={`flex items-center gap-3 py-3 first:pt-0 last:pb-0 ${sub.status === "activ" ? "" : "opacity-70"}`}>
      <BrandBadge name={sub.name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{sub.name}</span>
        <span className="block truncate text-xs text-muted">{detail}</span>
        {sub.status === "activ" && (trial !== null || increase || isUnused(sub) || automatic) && (
          <span className="mt-1 flex flex-wrap gap-1.5">
            {trial !== null && <Tag tone="indigo">Probă: {trial === 0 ? "se termină azi" : plural(trial, "zi", "zile")}</Tag>}
            {increase && <Tag tone="red">Scumpit cu {fmtRon(increase.delta)}</Tag>}
            {isUnused(sub) && <Tag tone="orange">Nefolosit</Tag>}
            {automatic && (
              <Tag tone="green">
                <Zap size={11} /> Automat
              </Tag>
            )}
          </span>
        )}
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-bold text-ink">{fmtRon(sub.price)}</span>
        <span className="block text-xs text-muted">{CYCLE_SUFFIX[sub.cycle]}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted" />
    </Link>
  );
}
