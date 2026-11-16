"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Info, Pencil, Trash2 } from "lucide-react";
import { AutopayCard } from "@/components/payments/AutopayCard";
import { PaymentStatusTag } from "@/components/payments/PaymentStatus";
import { SubjectIcon } from "@/components/shared/Badges";
import { Card, Tag } from "@/components/shared/Card";
import { Field, InfoNote } from "@/components/shared/Controls";
import { PageHeader } from "@/components/shared/PageHeader";
import { Sheet } from "@/components/shared/Sheet";
import { useFamily } from "@/context/FamilyContext";
import { EXPIRY_HINT, EXPIRY_LABEL, RENEWAL_OPTIONS } from "@/data/catalog";
import { fmtRon } from "@/lib/disputes";
import { expiryStatus, isVehicleKind, renewedExpiry } from "@/lib/expiry";
import { fmtDate, plural } from "@/lib/format";
import { expiryEventId } from "@/lib/payments";

export function InsuranceDetail({ itemId }: { itemId: string }) {
  const router = useRouter();
  const { expiries, payments, today, openCheckout, updateExpiry, removeExpiry, toast } = useFamily();
  const item = expiries.find((e) => e.id === itemId);
  const options = item ? RENEWAL_OPTIONS[item.kind] : [];
  const [optionId, setOptionId] = useState(options.find((o) => o.recommended)?.id ?? options[0]?.id ?? "");
  const [sheet, setSheet] = useState<"edit" | "delete" | null>(null);
  const [dateText, setDateText] = useState(item?.expiresOn ?? today);
  const [priceText, setPriceText] = useState(item ? String(item.price) : "");

  if (!item) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Asigurare" back="/asigurari" />
        <Card>Nu am găsit documentul. Poate a fost șters.</Card>
      </div>
    );
  }

  const status = expiryStatus(item, today);
  const option = options.find((o) => o.id === optionId) ?? options[0];
  const newExpiry = option ? renewedExpiry(item, option, today) : item.expiresOn;
  const eventId = expiryEventId(item);
  const inFlight = payments.find((p) => p.eventId === eventId && (p.status === "procesare" || p.status === "trimisa"));
  const lastPaid = [...payments].reverse().find((p) => p.targetId === item.id && p.status === "confirmata");
  const title = `${item.kind} · ${item.subject}`;
  const manualPrice = Number(priceText.replace(",", "."));
  const manualValid = /^\d{4}-\d{2}-\d{2}$/.test(dateText) && Number.isFinite(manualPrice) && manualPrice >= 0;

  function renew() {
    if (!item || !option) return;
    openCheckout(
      [
        {
          eventId,
          targetId: item.id,
          targetKind: "expiry",
          houseId: item.houseId,
          title,
          subtitle: `${option.label} · valabil până pe ${fmtDate(newExpiry)}`,
          amount: option.price,
          category: "asigurari",
          renew: { expiresOn: newExpiry, price: option.price, provider: option.provider },
        },
      ],
      `Reînnoiește ${item.kind}`,
    );
  }

  function saveManual() {
    if (!item || !manualValid) return;
    updateExpiry(item.id, { expiresOn: dateText, price: manualPrice });
    toast("Date actualizate");
    setSheet(null);
  }

  function remove() {
    if (!item) return;
    removeExpiry(item.id);
    toast(`Document șters: ${item.kind}`, "info");
    router.push("/asigurari");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={EXPIRY_LABEL[item.kind]} subtitle={item.subject} back="/asigurari" />

      <Card>
        <div className="flex items-center gap-3">
          <SubjectIcon kind={isVehicleKind(item.kind) ? "car" : "home"} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted">Stare</p>
            <Tag tone={status.tone}>{status.label}</Tag>
          </div>
        </div>
        <p className={`mt-4 text-4xl font-extrabold tracking-tight ${status.urgent ? "text-alert" : "text-ink"}`}>
          {status.days < 0 ? "Expirat" : status.days === 0 ? "Azi" : plural(status.days, "zi", "zile")}
        </p>
        <dl className="mt-3 flex flex-col gap-2 border-t border-line pt-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Valabil până pe</dt>
            <dd className="font-semibold text-ink">{fmtDate(item.expiresOn)}</dd>
          </div>
          {item.provider && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Emis de</dt>
              <dd className="font-semibold text-ink">{item.provider}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Ultimul preț</dt>
            <dd className="font-semibold text-ink">{fmtRon(item.price)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-muted">{EXPIRY_HINT[item.kind]}</p>
      </Card>

      {inFlight && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-ink">Reînnoire în curs</p>
            <PaymentStatusTag status={inFlight.status} />
          </div>
          <p className="mt-2 text-sm text-muted">Plata de {fmtRon(inFlight.amount)} este în drum. Noua valabilitate apare aici imediat ce este confirmată.</p>
        </Card>
      )}

      {!inFlight && lastPaid && !status.urgent && (
        <InfoNote icon={CheckCircle2} tone="success">
          Reînnoit din aplicație. Plata de {fmtRon(lastPaid.amount)} are referința {lastPaid.reference} și o găsești în Istoric.
        </InfoNote>
      )}

      {!inFlight && option && (
        <Card>
          <p className="font-bold text-ink">{status.urgent ? "Reînnoiește acum" : "Reînnoiește din timp"}</p>
          <p className="mt-1 text-sm text-muted">
            {status.days < 0 ? "Noua perioadă începe de azi." : `Noua perioadă începe pe ${fmtDate(item.expiresOn)}, când expiră cea curentă. Nu pierzi nicio zi.`}
          </p>
          <div role="radiogroup" aria-label="Opțiuni de reînnoire" className="mt-4 flex flex-col gap-2">
            {options.map((o) => {
              const active = o.id === option.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setOptionId(o.id)}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-2.5 text-left ${active ? "border-pago-blue bg-accent-soft" : "border-line bg-surface"}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{o.label}</span>
                      {o.recommended && <Tag tone="green">Recomandat</Tag>}
                    </span>
                    <span className="block truncate text-xs text-muted">{o.detail}</span>
                  </span>
                  <span className="shrink-0 font-extrabold text-ink">{fmtRon(o.price)}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted">
            Valabil până pe <b className="text-ink">{fmtDate(newExpiry)}</b>
          </p>
          <button onClick={renew} className="btn-dark mt-4 w-full">
            Reînnoiește · {fmtRon(option.price)}
          </button>
          <div className="mt-3">
            <InfoNote icon={Info}>Ofertele și prețurile sunt simulate pentru demo.</InfoNote>
          </div>
        </Card>
      )}

      <AutopayCard targetId={item.id} targetKind="expiry" houseId={item.houseId} name={title} typicalAmount={item.price} />

      <Card className="flex flex-col divide-y divide-line">
        <button
          onClick={() => {
            setDateText(item.expiresOn);
            setPriceText(String(item.price));
            setSheet("edit");
          }}
          className="flex min-h-12 items-center gap-3 py-2 text-left font-semibold text-ink first:pt-0"
        >
          <Pencil size={18} className="text-muted" /> Am reînnoit deja · actualizează data
        </button>
        <button onClick={() => setSheet("delete")} className="flex min-h-12 items-center gap-3 py-2 text-left font-semibold text-ink last:pb-0">
          <Trash2 size={18} className="text-muted" /> Șterge din aplicație
        </button>
      </Card>

      <Sheet
        open={sheet === "edit"}
        onClose={() => setSheet(null)}
        title="Actualizează manual"
        footer={
          <button onClick={saveManual} disabled={!manualValid} className="btn-dark w-full disabled:opacity-50">
            Salvează
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Valabil până pe">
            <input type="date" value={dateText} onChange={(e) => setDateText(e.target.value)} className="field-input" />
          </Field>
          <Field label="Preț plătit (RON)">
            <input inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value.replace(/[^\d.,]/g, ""))} className="field-input" />
          </Field>
        </div>
      </Sheet>

      <Sheet
        open={sheet === "delete"}
        onClose={() => setSheet(null)}
        title={`Ștergi ${item.kind}?`}
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
        <p className="text-sm text-muted">Nu vei mai primi remindere pentru acest document. Plățile deja făcute rămân în Istoric.</p>
      </Sheet>
    </div>
  );
}
