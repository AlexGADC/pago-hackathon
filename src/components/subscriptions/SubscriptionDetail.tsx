"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Gift, Moon, Pause, Pencil, Play, RotateCcw, Trash2, TrendingUp, XCircle } from "lucide-react";
import { AutopayCard } from "@/components/payments/AutopayCard";
import { PaymentStatusTag } from "@/components/payments/PaymentStatus";
import { BrandBadge } from "@/components/shared/Badges";
import { Card, Tag, type TagTone } from "@/components/shared/Card";
import { InfoNote } from "@/components/shared/Controls";
import { PageHeader } from "@/components/shared/PageHeader";
import { Sheet } from "@/components/shared/Sheet";
import { useFamily } from "@/context/FamilyContext";
import { CYCLE_LABEL, CYCLE_SUFFIX, SUBSCRIPTION_CATEGORY_LABEL } from "@/data/catalog";
import { daysUntil, fmtRon } from "@/lib/disputes";
import { daysLabel, fmtDate, fmtDay } from "@/lib/format";
import { buildEvents, eventState, toCheckoutItem, upcomingEvent } from "@/lib/payments";
import { reminderLabel } from "@/lib/reminders";
import { isUnused, monthlyCost, priceIncrease, trialDaysLeft, yearlyCost } from "@/lib/subscriptions";
import type { SubscriptionStatus } from "@/types/pago";
import { SubscriptionForm } from "./SubscriptionForm";

const STATUS: Record<SubscriptionStatus, { label: string; tone: TagTone }> = {
  activ: { label: "Activ", tone: "green" },
  pauza: { label: "În pauză", tone: "orange" },
  anulat: { label: "Anulat", tone: "gray" },
};

export function SubscriptionDetail({ subId }: { subId: string }) {
  const router = useRouter();
  const { subscriptions, members, ledger, today, openCheckout, payExternally, setSubscriptionStatus, updateSubscription, removeSubscription, toast } = useFamily();
  const sub = subscriptions.find((s) => s.id === subId);
  const [sheet, setSheet] = useState<"cancel" | "edit" | "delete" | null>(null);

  if (!sub) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Abonament" back="/abonamente" />
        <Card>Nu am găsit abonamentul. Poate a fost șters.</Card>
      </div>
    );
  }

  const status = STATUS[sub.status];
  const next = sub.status === "activ" ? upcomingEvent(ledger, sub.houseId, sub.id, today) : undefined;
  const nextState = next ? eventState(next) : null;
  const increase = priceIncrease(sub);
  const trial = trialDaysLeft(sub, today);
  const year = Number(today.slice(0, 4));
  const past = [year, year - 1]
    .flatMap((y) => buildEvents(ledger, sub.houseId, y, today))
    .filter((e) => e.targetId === sub.id && e.paid)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
  const people = members.filter((m) => !m.pending);
  const shared = sub.sharedWith ?? [];

  function toggleMember(id: string) {
    if (!sub) return;
    updateSubscription(sub.id, { sharedWith: shared.includes(id) ? shared.filter((x) => x !== id) : [...shared, id] });
  }

  function changeStatus(next_: SubscriptionStatus, message: string) {
    if (!sub) return;
    setSubscriptionStatus(sub.id, next_);
    toast(message, next_ === "activ" ? "success" : "info");
    setSheet(null);
  }

  function remove() {
    if (!sub) return;
    removeSubscription(sub.id);
    toast(`${sub.name} a fost șters`, "info");
    router.push("/abonamente");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={sub.name} subtitle={SUBSCRIPTION_CATEGORY_LABEL[sub.category]} back="/abonamente" />

      <Card>
        <div className="flex items-center gap-4">
          <BrandBadge name={sub.name} large />
          <div className="min-w-0 flex-1">
            <Tag tone={status.tone}>{status.label}</Tag>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
              {fmtRon(sub.price)}
              <span className="text-base font-semibold text-muted"> {CYCLE_SUFFIX[sub.cycle]}</span>
            </p>
          </div>
        </div>
        <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Plată</dt>
            <dd className="font-semibold text-ink">{CYCLE_LABEL[sub.cycle]}</dd>
          </div>
          {sub.cycle !== "monthly" && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Echivalent lunar</dt>
              <dd className="font-semibold text-ink">{fmtRon(Math.round(monthlyCost(sub) * 100) / 100)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Cost pe an</dt>
            <dd className="font-semibold text-ink">{fmtRon(Math.round(yearlyCost(sub) * 100) / 100)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{sub.status === "activ" ? "Următoarea plată" : sub.status === "pauza" ? "În pauză din" : "Anulat pe"}</dt>
            <dd className="text-right font-semibold text-ink">
              {sub.status === "activ" ? (next ? `${fmtDate(next.date)} · ${reminderLabel(daysUntil(next.date, today)).toLowerCase()}` : "—") : fmtDate(sub.statusChangedOn ?? today)}
            </dd>
          </div>
        </dl>
      </Card>

      {trial !== null && (
        <InfoNote icon={Gift} tone="warning">
          Perioada de probă se termină {trial === 0 ? "azi" : `în ${daysLabel(trial)}`}. De pe {fmtDay(sub.trialEndsOn ?? today)} plătești {fmtRon(sub.price)} {CYCLE_LABEL[sub.cycle]}. Dacă nu vrei să continui, anulează înainte.
        </InfoNote>
      )}
      {increase && sub.status === "activ" && (
        <InfoNote icon={TrendingUp} tone="alert">
          Prețul a crescut de la {fmtRon(sub.previousPrice ?? 0)} la {fmtRon(sub.price)}. Plătești cu {fmtRon(Math.round(increase.yearlyDelta * 100) / 100)} mai mult pe an.
        </InfoNote>
      )}
      {isUnused(sub) && (
        <Card>
          <p className="flex items-center gap-2 font-bold text-ink">
            <Moon size={18} className="text-family-coral" /> Nu l-ai mai folosit de {daysLabel(sub.lastUsedDaysAgo ?? 0)}
          </p>
          <p className="mt-1 text-sm text-muted">Te costă {fmtRon(Math.round(yearlyCost(sub)))} pe an. Îl păstrezi?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                updateSubscription(sub.id, { lastUsedDaysAgo: 0 });
                toast("Am notat că îl folosești");
              }}
              className="pill pill-soft"
            >
              Îl folosesc
            </button>
            <button onClick={() => changeStatus("pauza", `${sub.name} este în pauză`)} className="pill pill-primary">
              Pune pe pauză
            </button>
          </div>
        </Card>
      )}

      {next && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-ink">Plata din {fmtDay(next.date)}</p>
            {next.record ? <PaymentStatusTag status={next.record.status} /> : null}
          </div>
          {nextState === "auto" ? (
            <p className="mt-2 text-sm text-muted">{fmtRon(next.amount)} se plătesc automat. Nu trebuie să faci nimic.</p>
          ) : nextState === "pending" ? (
            <p className="mt-2 text-sm text-muted">Plata de {fmtRon(next.amount)} este în curs.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">
                {nextState === "failed" ? (next.record?.failureReason ?? "Plata nu a reușit.") : nextState === "blocked" ? `Suma depășește limita plății automate (${fmtRon(next.autopayLimit ?? 0)}), deci o plătești manual.` : "Poți plăti din timp, direct din aplicație."}
              </p>
              <button onClick={() => openCheckout([toCheckoutItem(next)])} className="btn-dark mt-4 w-full">
                {nextState === "failed" ? "Încearcă din nou" : `Plătește ${fmtRon(next.amount)}`}
              </button>
              <button
                onClick={() => {
                  payExternally(toCheckoutItem(next));
                  toast("Am notat plata. O găsești în Istoric.");
                }}
                className="mt-2 min-h-11 w-full text-sm font-semibold text-pago-blue"
              >
                Am plătit deja în altă parte
              </button>
            </>
          )}
        </Card>
      )}

      {sub.status === "activ" && <AutopayCard targetId={sub.id} targetKind="subscription" houseId={sub.houseId} name={sub.name} typicalAmount={sub.price} />}

      <Card>
        <p className="font-bold text-ink">Cine îl folosește</p>
        <p className="mt-1 text-sm text-muted">
          {shared.length > 1 ? `Împărțit la ${shared.length}, costă ${fmtRon(Math.round((sub.price / shared.length) * 100) / 100)} de persoană.` : "Marchează membrii familiei care folosesc abonamentul."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {people.map((m) => (
            <button key={m.id} type="button" aria-pressed={shared.includes(m.id)} onClick={() => toggleMember(m.id)} className={`pill ${shared.includes(m.id) ? "pill-primary" : "pill-soft"}`}>
              <span aria-hidden>{m.avatar}</span> {m.name}
            </button>
          ))}
        </div>
      </Card>

      {past.length > 0 && (
        <Card>
          <p className="mb-2 font-bold text-ink">Ultimele plăți</p>
          <ul className="flex flex-col divide-y divide-line">
            {past.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                <span className="text-muted">{fmtDate(e.date)}</span>
                <span className="font-semibold text-ink">{fmtRon(e.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="flex flex-col divide-y divide-line">
        {sub.status === "activ" && (
          <button onClick={() => changeStatus("pauza", `${sub.name} este în pauză`)} className="flex min-h-12 items-center gap-3 py-2 text-left font-semibold text-ink first:pt-0">
            <Pause size={18} className="text-muted" /> Pune pe pauză
          </button>
        )}
        {sub.status === "pauza" && (
          <button onClick={() => changeStatus("activ", `${sub.name} este din nou activ`)} className="flex min-h-12 items-center gap-3 py-2 text-left font-semibold text-ink first:pt-0">
            <Play size={18} className="text-muted" /> Reia abonamentul
          </button>
        )}
        {sub.status === "anulat" ? (
          <button onClick={() => changeStatus("activ", `${sub.name} a fost reactivat`)} className="flex min-h-12 items-center gap-3 py-2 text-left font-semibold text-ink first:pt-0">
            <RotateCcw size={18} className="text-muted" /> Reactivează
          </button>
        ) : (
          <button onClick={() => setSheet("cancel")} className="flex min-h-12 items-center gap-3 py-2 text-left font-semibold text-alert">
            <XCircle size={18} /> Anulează abonamentul
          </button>
        )}
        <button onClick={() => setSheet("edit")} className="flex min-h-12 items-center gap-3 py-2 text-left font-semibold text-ink">
          <Pencil size={18} className="text-muted" /> Editează
        </button>
        <button onClick={() => setSheet("delete")} className="flex min-h-12 items-center gap-3 py-2 text-left font-semibold text-ink last:pb-0">
          <Trash2 size={18} className="text-muted" /> Șterge din aplicație
        </button>
      </Card>

      <Sheet
        open={sheet === "cancel"}
        onClose={() => setSheet(null)}
        title={`Anulezi ${sub.name}?`}
        footer={
          <div className="flex flex-col gap-2">
            <button onClick={() => changeStatus("anulat", `${sub.name} a fost anulat`)} className="btn-dark w-full">
              Da, anulează
            </button>
            <button onClick={() => setSheet(null)} className="btn-soft w-full">
              Îl păstrez
            </button>
          </div>
        }
      >
        <ul className="flex flex-col gap-3 text-sm text-ink">
          <li className="rounded-2xl bg-surface-2 p-3">Dispare din calendar și din plățile viitoare. Plata automată se oprește.</li>
          <li className="rounded-2xl bg-surface-2 p-3">{next ? `Mai ai acces până pe ${fmtDate(next.date)}, cât acoperă ultima plată.` : "Nu mai ai nicio plată programată."}</li>
          <li className="rounded-2xl bg-surface-2 p-3">
            Anulează și în contul tău {sub.name} (Setări → Abonament → Anulează), ca furnizorul să nu te mai taxeze direct.
          </li>
          <li className="rounded-2xl bg-surface-2 p-3">Îl poți reactiva oricând din lista Anulate.</li>
        </ul>
      </Sheet>

      <Sheet open={sheet === "edit"} onClose={() => setSheet(null)} title={`Editează ${sub.name}`}>
        <SubscriptionForm initial={sub} onSaved={() => setSheet(null)} />
      </Sheet>

      <Sheet
        open={sheet === "delete"}
        onClose={() => setSheet(null)}
        title={`Ștergi ${sub.name}?`}
        footer={
          <div className="flex flex-col gap-2">
            <button onClick={remove} className="btn-dark w-full">
              Da, șterge
            </button>
            <button onClick={() => setSheet(null)} className="btn-soft w-full">
              Renunță
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted">Abonamentul dispare din listă și din calendar. Plățile deja făcute din aplicație rămân în Istoric. Dacă vrei doar să nu mai plătești, alege Anulează.</p>
      </Sheet>
    </div>
  );
}
