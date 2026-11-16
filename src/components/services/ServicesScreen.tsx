"use client";

import { useState } from "react";
import { Car, Landmark, Smartphone, Waypoints, type LucideIcon } from "lucide-react";
import { PaymentStatusTag } from "@/components/payments/PaymentStatus";
import { CategoryBadge } from "@/components/shared/Badges";
import { Card, SectionTitle, Tag } from "@/components/shared/Card";
import { Chip, Field, InfoNote } from "@/components/shared/Controls";
import { PageHeader } from "@/components/shared/PageHeader";
import { Sheet } from "@/components/shared/Sheet";
import { useFamily } from "@/context/FamilyContext";
import { BRIDGE_TOLL_PRICE, RENEWAL_OPTIONS, TAX_DEBTS, TOPUP_AMOUNTS, TOPUP_OPERATORS } from "@/data/catalog";
import { fmtRon } from "@/lib/disputes";
import { fmtDate, fmtDay, uniqueId } from "@/lib/format";
import type { CheckoutItem } from "@/types/pago";

type ServiceKind = "topup" | "vignette" | "bridge" | "taxes";

const SERVICES: { kind: ServiceKind; title: string; text: string; Icon: LucideIcon }[] = [
  { kind: "topup", title: "Reîncărcare cartelă", text: "Orange, Vodafone, Digi", Icon: Smartphone },
  { kind: "vignette", title: "Rovinietă", text: "De la 7 zile la 12 luni", Icon: Car },
  { kind: "bridge", title: "Taxă de pod", text: "Fetești – Cernavodă", Icon: Waypoints },
  { kind: "taxes", title: "Impozite locale", text: "Prin ghișeul.ro", Icon: Landmark },
];

const VIGNETTE_OPTIONS = RENEWAL_OPTIONS["Rovinietă"];

export function ServicesScreen() {
  const { house, payments, openCheckout } = useFamily();
  const [open, setOpen] = useState<ServiceKind | null>(null);
  const [operator, setOperator] = useState(TOPUP_OPERATORS[0]);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(TOPUP_AMOUNTS[1]);
  const [plate, setPlate] = useState("");
  const [vignetteId, setVignetteId] = useState(VIGNETTE_OPTIONS[0].id);
  const [crossings, setCrossings] = useState(1);

  const digits = phone.replace(/\D/g, "");
  const phoneValid = /^07\d{8}$/.test(digits);
  const plateValid = plate.trim().length >= 5;
  const vignette = VIGNETTE_OPTIONS.find((o) => o.id === vignetteId) ?? VIGNETTE_OPTIONS[0];
  const recent = payments.filter((p) => p.houseId === house.id && p.category === "servicii").slice(-5).reverse();
  const taxState = TAX_DEBTS.map((debt) => ({ debt, record: [...payments].reverse().find((p) => p.eventId === debt.id && p.houseId === house.id) }));
  const unpaidTaxes = taxState.filter((t) => t.record?.status !== "confirmata" && t.record?.status !== "procesare" && t.record?.status !== "trimisa");

  function checkout(item: Omit<CheckoutItem, "houseId" | "targetKind" | "category">, title: string) {
    setOpen(null);
    openCheckout([{ ...item, houseId: house.id, targetKind: "extra", category: "servicii" }], title);
  }

  function payTopup() {
    if (!phoneValid) return;
    checkout({ eventId: uniqueId("svc-topup"), title: `Reîncărcare ${operator}`, subtitle: `${digits.slice(0, 4)} *** ${digits.slice(7)}`, amount }, "Reîncărcare cartelă");
  }

  function payVignette() {
    if (!plateValid) return;
    checkout({ eventId: uniqueId("svc-rov"), title: `Rovinietă · ${plate.trim().toUpperCase()}`, subtitle: `${vignette.label} · ${vignette.detail}`, amount: vignette.price }, "Rovinietă");
  }

  function payBridge() {
    if (!plateValid) return;
    checkout(
      { eventId: uniqueId("svc-pod"), title: `Taxă pod Fetești · ${plate.trim().toUpperCase()}`, subtitle: crossings === 1 ? "O trecere" : "Dus-întors", amount: crossings * BRIDGE_TOLL_PRICE },
      "Taxă de pod",
    );
  }

  function payTaxes(ids: string[]) {
    const items = TAX_DEBTS.filter((d) => ids.includes(d.id)).map((d) => ({ eventId: d.id, title: d.title, subtitle: d.authority, amount: d.amount, houseId: house.id, targetKind: "extra" as const, category: "servicii" as const }));
    setOpen(null);
    openCheckout(items, "Impozite locale");
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="Alte plăți" subtitle="Plătești pe loc, fără comision" back="/" />

      <div className="grid grid-cols-2 gap-3">
        {SERVICES.map(({ kind, title, text, Icon }) => (
          <button key={kind} onClick={() => setOpen(kind)} className="flex flex-col items-start gap-3 rounded-card bg-surface p-4 text-left shadow-card">
            <span className="grid size-11 place-items-center rounded-2xl bg-cat-amber/15 text-cat-amber">
              <Icon size={20} />
            </span>
            <span>
              <span className="block font-bold leading-tight text-ink">{title}</span>
              <span className="mt-0.5 block text-xs text-muted">{text}</span>
            </span>
          </button>
        ))}
      </div>

      {recent.length > 0 && (
        <>
          <SectionTitle>Plăți recente</SectionTitle>
          <Card className="flex flex-col divide-y divide-line">
            {recent.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <CategoryBadge category="servicii" filled={p.status === "confirmata"} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{p.title}</p>
                  <p className="text-xs text-muted">
                    {fmtDay(p.createdAt)} · {p.reference}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-bold text-ink">{fmtRon(p.amount)}</span>
                  {p.status !== "confirmata" && <PaymentStatusTag status={p.status} />}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      <Sheet
        open={open === "topup"}
        onClose={() => setOpen(null)}
        title="Reîncărcare cartelă"
        footer={
          <button onClick={payTopup} disabled={!phoneValid} className="btn-dark w-full disabled:opacity-50">
            Continuă · {fmtRon(amount)}
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Operator</p>
            <div className="flex flex-wrap gap-2">
              {TOPUP_OPERATORS.map((o) => (
                <Chip key={o} active={operator === o} onClick={() => setOperator(o)}>
                  {o}
                </Chip>
              ))}
            </div>
          </div>
          <Field label="Număr de telefon" error={digits.length >= 10 && !phoneValid ? "Scrie un număr de mobil de forma 07xx xxx xxx." : null}>
            <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, "").slice(0, 13))} placeholder="07xx xxx xxx" className="field-input" />
          </Field>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Sumă</p>
            <div className="flex flex-wrap gap-2">
              {TOPUP_AMOUNTS.map((a) => (
                <Chip key={a} active={amount === a} onClick={() => setAmount(a)}>
                  {a} RON
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={open === "vignette"}
        onClose={() => setOpen(null)}
        title="Rovinietă"
        footer={
          <button onClick={payVignette} disabled={!plateValid} className="btn-dark w-full disabled:opacity-50">
            Continuă · {fmtRon(vignette.price)}
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Număr de înmatriculare">
            <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ex: CJ-01-ABC" className="field-input uppercase" />
          </Field>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Valabilitate</p>
            <div className="flex flex-wrap gap-2">
              {VIGNETTE_OPTIONS.map((o) => (
                <Chip key={o.id} active={vignette.id === o.id} onClick={() => setVignetteId(o.id)}>
                  {o.label} · {o.price} RON
                </Chip>
              ))}
            </div>
          </div>
          <InfoNote icon={Car}>Pentru mașinile tale din Asigurări, rovinieta se reînnoiește de acolo și primești reminder înainte să expire. Prețuri simulate pentru demo.</InfoNote>
        </div>
      </Sheet>

      <Sheet
        open={open === "bridge"}
        onClose={() => setOpen(null)}
        title="Taxă de pod Fetești – Cernavodă"
        footer={
          <button onClick={payBridge} disabled={!plateValid} className="btn-dark w-full disabled:opacity-50">
            Continuă · {fmtRon(crossings * BRIDGE_TOLL_PRICE)}
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Număr de înmatriculare">
            <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ex: CJ-01-ABC" className="field-input uppercase" />
          </Field>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Treceri</p>
            <div className="flex flex-wrap gap-2">
              <Chip active={crossings === 1} onClick={() => setCrossings(1)}>
                O trecere · {BRIDGE_TOLL_PRICE} RON
              </Chip>
              <Chip active={crossings === 2} onClick={() => setCrossings(2)}>
                Dus-întors · {2 * BRIDGE_TOLL_PRICE} RON
              </Chip>
            </div>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={open === "taxes"}
        onClose={() => setOpen(null)}
        title="Impozite locale"
        footer={
          unpaidTaxes.length > 1 ? (
            <button onClick={() => payTaxes(unpaidTaxes.map((t) => t.debt.id))} className="btn-dark w-full">
              Plătește tot · {fmtRon(unpaidTaxes.reduce((sum, t) => sum + t.debt.amount, 0))}
            </button>
          ) : undefined
        }
      >
        <InfoNote icon={Landmark}>Datoriile sunt preluate din contul tău ghișeul.ro (simulat). Plata la stat are comision 0.</InfoNote>
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {taxState.map(({ debt, record }) => {
            const paid = record?.status === "confirmata";
            const pending = record?.status === "procesare" || record?.status === "trimisa";
            return (
              <li key={debt.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold leading-snug text-ink">{debt.title}</p>
                  <p className="text-xs text-muted">
                    {debt.authority} · scadent {fmtDate(debt.dueOn)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="font-bold text-ink">{fmtRon(debt.amount)}</span>
                  {paid ? (
                    <Tag tone="green">Plătit</Tag>
                  ) : pending && record ? (
                    <PaymentStatusTag status={record.status} />
                  ) : (
                    <button onClick={() => payTaxes([debt.id])} className="pill pill-primary">
                      Plătește
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </div>
  );
}
