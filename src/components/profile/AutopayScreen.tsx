"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, ShieldCheck, Zap } from "lucide-react";
import { PaymentStatusTag } from "@/components/payments/PaymentStatus";
import { ReceiptSheet } from "@/components/payments/ReceiptSheet";
import { CategoryBadge } from "@/components/shared/Badges";
import { Card, SectionTitle } from "@/components/shared/Card";
import { InfoNote, Toggle } from "@/components/shared/Controls";
import { PageHeader } from "@/components/shared/PageHeader";
import { useFamily } from "@/context/FamilyContext";
import { autopayMonthlyTotal, resolveTarget, type TargetInfo } from "@/lib/autopay";
import { cardLabel } from "@/lib/checkout";
import { fmtRon } from "@/lib/disputes";
import { daysLabel, fmtDateTime, plural } from "@/lib/format";
import type { AutopayRule } from "@/types/pago";

export function AutopayScreen() {
  const { autopay, autopayLog, methods, bills, subscriptions, expiries, payments, house, saveAutopay, disableAutopay, toast } = useFamily();
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const source = { bills, subscriptions, expiries };
  const rules = autopay
    .map((rule) => ({ rule, target: resolveTarget(source, rule.targetId) }))
    .filter((x): x is { rule: AutopayRule; target: TargetInfo } => x.target !== null);
  const active = rules.filter((x) => x.rule.enabled);
  const covered = autopay.filter((r) => r.enabled).map((r) => r.targetId);
  const suggestions: TargetInfo[] = [
    ...bills.filter((b) => b.houseId === house.id && b.status !== "red_flag" && !covered.includes(b.id)).map((b) => resolveTarget(source, b.id)),
    ...subscriptions.filter((s) => s.houseId === house.id && s.status === "activ" && !covered.includes(s.id)).map((s) => resolveTarget(source, s.id)),
  ].filter((t): t is TargetInfo => t !== null);
  const log = [...autopayLog].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  const executed = payments
    .filter((p) => p.auto)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const receipt = payments.find((p) => p.id === receiptId) ?? null;

  function toggle(rule: AutopayRule, target: TargetInfo, enabled: boolean) {
    if (enabled) {
      saveAutopay({ targetId: rule.targetId, targetKind: rule.targetKind, maxAmount: rule.maxAmount, methodId: rule.methodId, noticeDays: rule.noticeDays, name: target.name });
      toast("Plata automată este activă");
    } else {
      disableAutopay(rule.targetId, target.name);
      toast("Plata automată a fost oprită", "info");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="Plăți automate" back="/profil" />

      <Card>
        <p className="text-sm font-medium text-muted">Plătite automat, în medie</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
          {fmtRon(Math.round(autopayMonthlyTotal(autopay, source)))}
          <span className="text-base font-semibold text-muted"> /lună</span>
        </p>
        <p className="mt-1 text-sm text-muted">{active.length ? plural(active.length, "plată automată activă", "plăți automate active") : "Nu ai nicio plată automată activă"}</p>
      </Card>

      <InfoNote icon={ShieldCheck}>
        Fiecare plată automată are o limită de siguranță. Te anunțăm înainte, cu data și suma. Dacă suma depășește limita sau factura pare greșită, plata nu se face și decizi tu. O poți opri oricând.
      </InfoNote>

      {rules.length > 0 && (
        <>
          <SectionTitle>Regulile tale</SectionTitle>
          <Card className="flex flex-col divide-y divide-line">
            {rules.map(({ rule, target }) => {
              const method = methods.find((m) => m.id === rule.methodId);
              return (
                <div key={rule.targetId} className={`flex items-center gap-3 py-3 first:pt-0 last:pb-0 ${rule.enabled ? "" : "opacity-70"}`}>
                  <Link href={target.href} className="flex min-w-0 flex-1 items-center gap-3">
                    <CategoryBadge category={target.category} filled={rule.enabled} size="lg" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{target.name}</span>
                      <span className="block truncate text-xs text-muted">
                        Limită {fmtRon(rule.maxAmount)} · {method ? cardLabel(method) : "fără card"} · anunț cu {daysLabel(rule.noticeDays)} înainte
                      </span>
                    </span>
                  </Link>
                  <Toggle checked={rule.enabled} onChange={(value) => toggle(rule, target, value)} label={`Plată automată pentru ${target.name}`} />
                </div>
              );
            })}
          </Card>
        </>
      )}

      {executed.length > 0 && (
        <>
          <SectionTitle>Plătite automat</SectionTitle>
          <Card className="flex flex-col divide-y divide-line">
            {executed.map((p) => (
              <button key={p.id} onClick={() => setReceiptId(p.id)} className="flex min-h-14 items-center gap-3 py-2.5 text-left first:pt-0 last:pb-0">
                <CategoryBadge category={p.category} filled={p.status === "confirmata"} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{p.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {fmtDateTime(p.createdAt)} · {p.methodLabel}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`font-bold ${p.status === "esuata" ? "text-muted line-through" : "text-ink"}`}>{fmtRon(p.amount)}</span>
                  <PaymentStatusTag status={p.status} />
                </span>
              </button>
            ))}
          </Card>
        </>
      )}

      {suggestions.length > 0 && (
        <>
          <SectionTitle>Poți activa și pentru</SectionTitle>
          <Card className="flex flex-col divide-y divide-line">
            {suggestions.map((target) => (
              <Link key={target.id} href={target.href} className="flex min-h-14 items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <CategoryBadge category={target.category} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{target.name}</span>
                  <span className="block truncate text-xs text-muted">
                    ≈ {fmtRon(target.amount)} · {target.rhythm}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-pago-blue">
                  <Zap size={14} /> Activează
                </span>
                <ChevronRight size={18} className="shrink-0 text-muted" />
              </Link>
            ))}
          </Card>
        </>
      )}

      {log.length > 0 && (
        <>
          <SectionTitle>Jurnalul plăților automate</SectionTitle>
          <Card>
            <ul className="flex flex-col divide-y divide-line">
              {log.map((entry) => (
                <li key={entry.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="text-sm text-ink">{entry.text}</p>
                  <p className="text-xs text-muted">{fmtDateTime(entry.at)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {receipt && <ReceiptSheet record={receipt} onClose={() => setReceiptId(null)} />}
    </div>
  );
}
