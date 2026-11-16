"use client";

import { useState } from "react";
import { BrandBadge } from "@/components/shared/Badges";
import { Field, Segmented, Toggle } from "@/components/shared/Controls";
import { useFamily } from "@/context/FamilyContext";
import { SUBSCRIPTION_CATEGORY_LABEL, SUBSCRIPTION_PRESETS, type SubscriptionPreset } from "@/data/catalog";
import { fmtRon } from "@/lib/disputes";
import { addDays } from "@/lib/format";
import { CYCLE_MONTHS } from "@/lib/subscriptions";
import type { BillingCycle, Subscription, SubscriptionCategory } from "@/types/pago";

const CYCLES: { value: BillingCycle; label: string }[] = [
  { value: "monthly", label: "Lunar" },
  { value: "quarterly", label: "La 3 luni" },
  { value: "yearly", label: "Anual" },
];

const CATEGORIES = Object.keys(SUBSCRIPTION_CATEGORY_LABEL) as SubscriptionCategory[];

export function SubscriptionForm({ initial, onSaved }: { initial?: Subscription; onSaved: (id: string) => void }) {
  const { house, today, addSubscription, updateSubscription, toast } = useFamily();
  const [name, setName] = useState(initial?.name ?? "");
  const [priceText, setPriceText] = useState(initial ? String(initial.price) : "");
  const [cycle, setCycle] = useState<BillingCycle>(initial?.cycle ?? "monthly");
  const [date, setDate] = useState(initial?.renewsOn ?? addDays(today, 7));
  const [category, setCategory] = useState<SubscriptionCategory>(initial?.category ?? "streaming");
  const [trial, setTrial] = useState(Boolean(initial?.trialEndsOn));

  const price = Number(priceText.replace(",", "."));
  const priceValid = Number.isFinite(price) && price > 0;
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && (Boolean(initial) || date >= today);
  const valid = name.trim().length >= 2 && priceValid && dateValid;

  function applyPreset(preset: SubscriptionPreset) {
    setName(preset.name);
    setPriceText(String(preset.price));
    setCycle(preset.cycle);
    setCategory(preset.category);
  }

  function save() {
    if (!valid) return;
    if (initial) {
      const changed = price !== initial.price;
      updateSubscription(initial.id, {
        name: name.trim(),
        price,
        cycle,
        renewsOn: date,
        category,
        trialEndsOn: trial ? date : undefined,
        previousPrice: changed ? initial.price : initial.previousPrice,
        priceChangedOn: changed ? today : initial.priceChangedOn,
      });
      toast("Abonament actualizat");
      onSaved(initial.id);
      return;
    }
    const id = addSubscription({
      houseId: house.id,
      name: name.trim(),
      price,
      cycle,
      renewsOn: date,
      category,
      status: "activ",
      startedOn: date,
      trialEndsOn: trial ? date : undefined,
      lastUsedDaysAgo: 0,
    });
    toast(`${name.trim()} a fost adăugat`);
    onSaved(id);
  }

  return (
    <div className="flex flex-col gap-4">
      {!initial && (
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Alege rapid un serviciu</p>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {SUBSCRIPTION_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                aria-pressed={name === preset.name}
                className={`flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl border p-3 text-center ${name === preset.name ? "border-pago-blue bg-accent-soft" : "border-line bg-surface"}`}
              >
                <BrandBadge name={preset.name} />
                <span className="line-clamp-2 text-[11px] font-bold leading-tight text-ink">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Field label="Numele abonamentului">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Netflix" className="field-input" />
      </Field>

      <Field label="Preț (RON)" hint={priceValid ? `Asta înseamnă ${fmtRon(Math.round((price * 12) / CYCLE_MONTHS[cycle]))} pe an.` : "Prețurile sugerate sunt orientative. Scrie suma de pe contul tău."}>
        <input inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="0" className="field-input" />
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-ink">Cât de des plătești</p>
        <Segmented value={cycle} onChange={setCycle} options={CYCLES} label="Frecvența plății" />
      </div>

      <Field label="Următoarea plată" error={dateValid ? null : "Alege o dată de azi încolo."}>
        <input type="date" value={date} min={initial ? undefined : today} onChange={(e) => setDate(e.target.value)} className="field-input" />
      </Field>

      <Field label="Categorie">
        <select value={category} onChange={(e) => setCategory(e.target.value as SubscriptionCategory)} className="field-input">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {SUBSCRIPTION_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Sunt în perioada de probă</p>
          <p className="text-xs text-muted">Te anunțăm înainte de prima plată, ca să poți anula la timp.</p>
        </div>
        <Toggle checked={trial} onChange={setTrial} label="Perioadă de probă" />
      </div>

      <button onClick={save} disabled={!valid} className="btn-dark w-full disabled:opacity-50">
        {initial ? "Salvează modificările" : "Adaugă abonamentul"}
      </button>
    </div>
  );
}
