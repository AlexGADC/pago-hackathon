"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, CopyCheck, CreditCard, Fingerprint, Gift, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { CategoryBadge } from "@/components/shared/Badges";
import { Tag } from "@/components/shared/Card";
import { InfoNote, Toggle } from "@/components/shared/Controls";
import { Sheet } from "@/components/shared/Sheet";
import { useFamily, type CheckoutRequest } from "@/context/FamilyContext";
import { cardExpiryLabel, cardLabel, checkoutTotals, duplicateMessage, findDuplicates, isCardExpired, maxDiscount, payeeLabel } from "@/lib/checkout";
import { fmtNum, fmtRon } from "@/lib/disputes";
import { plural } from "@/lib/format";
import { ConnectionBadge, PaymentStatusTag, PaymentTimeline } from "./PaymentStatus";
import { ReceiptSheet } from "./ReceiptSheet";

const VERIFY_MS = 900;

export function CheckoutSheet() {
  const { checkout, closeCheckout } = useFamily();
  if (!checkout) return null;
  return <CheckoutFlow key={checkout.items.map((i) => i.eventId).join("|")} request={checkout} onClose={closeCheckout} />;
}

function CheckoutFlow({ request, onClose }: { request: CheckoutRequest; onClose: () => void }) {
  const { methods, points, settings, payments, connections, defaultMethod, today, pay, reconnect } = useFamily();
  const usable = methods.filter((m) => !isCardExpired(m, today));
  const preferred = defaultMethod && !isCardExpired(defaultMethod, today) ? defaultMethod : usable[0];

  const [selected, setSelected] = useState<string[]>(request.items.map((i) => i.eventId));
  const [methodId, setMethodId] = useState<string>(preferred?.id ?? "");
  const [usePoints, setUsePoints] = useState(false);
  const [phase, setPhase] = useState<"review" | "duplicate" | "verify" | "result">("review");
  const [paidIds, setPaidIds] = useState<string[]>([]);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const multiple = request.items.length > 1;
  const items = request.items.filter((i) => selected.includes(i.eventId));
  const possible = maxDiscount(points, checkoutTotals(items, points, false).subtotal);
  const totals = checkoutTotals(items, points, usePoints && possible > 0);
  const method = usable.find((m) => m.id === methodId);
  const canPay = items.length > 0 && Boolean(method);
  const duplicates = findDuplicates(items, payments, today);

  const records = payments.filter((p) => paidIds.includes(p.id));
  const inFlight = records.some((p) => p.status === "procesare" || p.status === "trimisa");
  const failed = records.filter((p) => p.status === "esuata");
  const confirmed = records.filter((p) => p.status === "confirmata");
  const earned = confirmed.reduce((sum, p) => sum + p.pointsEarned, 0);
  const receipt = payments.find((p) => p.id === receiptId) ?? null;

  function toggle(eventId: string) {
    setSelected((list) => (list.includes(eventId) ? list.filter((id) => id !== eventId) : [...list, eventId]));
  }

  function run() {
    if (!method) return;
    setPaidIds(pay(items, method.id, usePoints && possible > 0));
    setPhase("result");
  }

  function authorize() {
    if (settings.appLock) {
      setPhase("verify");
      setTimeout(run, VERIFY_MS);
      return;
    }
    run();
  }

  function confirm() {
    if (!canPay) return;
    if (duplicates.length > 0) {
      setPhase("duplicate");
      return;
    }
    authorize();
  }

  function skipDuplicates() {
    const repeated = duplicates.map((d) => d.item.eventId);
    const rest = selected.filter((id) => !repeated.includes(id));
    if (rest.length === 0) {
      onClose();
      return;
    }
    setSelected(rest);
    setPhase("review");
  }

  function retry() {
    setSelected(failed.map((p) => p.eventId));
    setPaidIds([]);
    setPhase("review");
  }

  if (phase === "duplicate") {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Plată repetată"
        footer={
          <div className="flex gap-2">
            <button onClick={skipDuplicates} className="btn-soft flex-1">
              Anulează
            </button>
            <button onClick={authorize} className="btn-dark flex-1">
              Plătește oricum
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center py-6 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-warning-bg text-warning">
            <CopyCheck size={32} />
          </span>
          <ul className="mt-4 flex flex-col gap-3">
            {duplicates.map((d) => (
              <li key={d.item.eventId}>
                <p className="text-lg font-bold text-ink">{duplicateMessage(d)}</p>
                <p className="mt-1 text-xs text-muted">
                  Plata anterioară: {fmtRon(d.record.amount)} · referință {d.record.reference}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-semibold text-ink">Sigur plătești din nou?</p>
          <p className="mt-1 text-sm text-muted">
            {items.length > duplicates.length
              ? duplicates.length > 1
                ? "Dacă anulezi, plățile repetate ies din listă și poți plăti restul."
                : "Dacă anulezi, plata repetată iese din listă și poți plăti restul."
              : "Dacă anulezi, nu pleacă niciun ban din cont."}
          </p>
        </div>
      </Sheet>
    );
  }

  if (phase === "verify") {
    return (
      <Sheet open onClose={onClose} title="Confirmă plata">
        <div className="flex flex-col items-center py-10 text-center">
          <span className="grid size-20 animate-pulse place-items-center rounded-full bg-accent-soft text-pago-blue">
            <Fingerprint size={40} />
          </span>
          <p className="mt-4 text-lg font-bold text-ink">Se verifică identitatea…</p>
          <p className="mt-1 text-sm text-muted">Blocarea aplicației este activă, așa că fiecare plată se confirmă cu amprenta.</p>
        </div>
      </Sheet>
    );
  }

  if (phase === "result") {
    const allConfirmed = records.length > 0 && confirmed.length === records.length;
    const single = records.length === 1 ? records[0] : null;
    return (
      <>
        <Sheet open onClose={onClose} title="Starea plății">
          <div className="flex flex-col items-center pb-2 pt-1 text-center">
            {inFlight ? (
              <Loader2 size={44} className="animate-spin text-pago-blue" />
            ) : allConfirmed ? (
              <CheckCircle2 size={48} className="text-success" />
            ) : (
              <XCircle size={48} className="text-alert" />
            )}
            <p className="mt-3 text-xl font-extrabold text-ink">
              {inFlight
                ? "Se procesează plata…"
                : allConfirmed
                  ? records.length > 1
                    ? "Toate plățile sunt confirmate"
                    : "Plată confirmată de furnizor"
                  : confirmed.length > 0
                    ? `${confirmed.length} din ${plural(records.length, "plată", "plăți")} confirmate`
                    : "Plata nu a reușit"}
            </p>
            {!inFlight && earned > 0 && <p className="mt-1 text-sm font-semibold text-family-coral">+{earned} puncte Pago</p>}
          </div>

          {single ? (
            <div className="mt-4 rounded-2xl bg-surface-2 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">{single.title}</p>
                  <p className="text-xs text-muted">Referință {single.reference}</p>
                </div>
                <span className="shrink-0 text-lg font-extrabold text-ink">{fmtRon(single.amount)}</span>
              </div>
              <PaymentTimeline record={single} />
            </div>
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-line rounded-2xl bg-surface-2 px-4">
              {records.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{r.title}</p>
                      <PaymentStatusTag status={r.status} />
                    </div>
                    <span className="shrink-0 font-bold text-ink">{fmtRon(r.amount)}</span>
                  </div>
                  {r.status === "esuata" && <p className="mt-2 text-xs leading-relaxed text-alert">{r.failureReason}</p>}
                </li>
              ))}
            </ul>
          )}

          {failed.map((r) => {
            const connection = connections.find((c) => c.provider === r.title && c.houseId === r.houseId);
            if (!connection || connection.status === "conectat") return null;
            return (
              <div key={r.id} className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-alert-bg p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{r.title}</p>
                  <ConnectionBadge status={connection.status} />
                </div>
                {connection.status === "deconectat" && (
                  <button onClick={() => reconnect(r.title, r.houseId)} className="pill pill-primary shrink-0">
                    <RefreshCw size={14} /> Reconectează
                  </button>
                )}
              </div>
            );
          })}

          {inFlight && <p className="mt-4 text-center text-xs text-muted">Poți închide fereastra. Plata continuă, iar starea ei rămâne în Istoric.</p>}

          <div className="mt-5 flex flex-col gap-2">
            {!inFlight && failed.length > 0 && (
              <button onClick={retry} className="btn-dark w-full">
                <RefreshCw size={16} /> Încearcă din nou
              </button>
            )}
            {single && single.status === "confirmata" && (
              <button onClick={() => setReceiptId(single.id)} className="btn-soft w-full">
                Vezi chitanța
              </button>
            )}
            <button onClick={onClose} className={!inFlight && failed.length === 0 ? "btn-dark w-full" : "btn-soft w-full"}>
              {inFlight ? "Închide" : "Gata"}
            </button>
          </div>
        </Sheet>
        {receipt && <ReceiptSheet record={receipt} onClose={() => setReceiptId(null)} />}
      </>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={request.title ?? (multiple ? "Plătește tot" : "Plătește")}
      footer={
        <button onClick={confirm} disabled={!canPay} className="btn-dark w-full disabled:opacity-50">
          {settings.appLock && <Fingerprint size={18} />}
          {settings.appLock ? `Confirmă cu amprenta · ${fmtRon(totals.total)}` : `Plătește ${fmtRon(totals.total)}`}
        </button>
      }
    >
      <ul className="flex flex-col divide-y divide-line">
        {request.items.map((item) => (
          <li key={item.eventId} className="flex min-h-14 items-center gap-3 py-2.5">
            {multiple && (
              <input
                type="checkbox"
                checked={selected.includes(item.eventId)}
                onChange={() => toggle(item.eventId)}
                aria-label={`Include ${item.title}`}
                className="size-5 shrink-0 accent-pago-blue"
              />
            )}
            <CategoryBadge category={item.category} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{item.title}</p>
              {item.subtitle && <p className="truncate text-xs text-muted">{item.subtitle}</p>}
            </div>
            <span className="shrink-0 font-bold text-ink">{fmtRon(item.amount)}</span>
          </li>
        ))}
      </ul>

      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted">Plătești cu</p>
      {methods.length === 0 ? (
        <InfoNote icon={CreditCard} tone="warning">
          Nu ai niciun card salvat. Adaugă unul ca să poți plăti.
        </InfoNote>
      ) : (
        <div role="radiogroup" aria-label="Metodă de plată" className="flex flex-col gap-2">
          {methods.map((m) => {
            const expired = isCardExpired(m, today);
            const active = m.id === methodId && !expired;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={expired}
                onClick={() => setMethodId(m.id)}
                className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-2.5 text-left disabled:opacity-60 ${active ? "border-pago-blue bg-accent-soft" : "border-line bg-surface"}`}
              >
                <CreditCard size={18} className="shrink-0 text-pago-blue" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{cardLabel(m)}</span>
                  <span className="block truncate text-xs text-muted">
                    {m.label} · expiră {cardExpiryLabel(m)}
                  </span>
                </span>
                {expired ? <Tag tone="red">Expirat</Tag> : active ? <CheckCircle2 size={18} className="shrink-0 text-pago-blue" /> : null}
              </button>
            );
          })}
        </div>
      )}
      <Link href="/profil/carduri" onClick={onClose} className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-pago-blue">
        Adaugă sau schimbă cardurile
      </Link>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Gift size={18} className="shrink-0 text-family-coral" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Folosește punctele Pago</p>
            <p className="text-xs text-muted">
              {possible > 0 ? `Ai ${fmtNum(points)} puncte · reducere de ${fmtRon(possible)}` : `Ai ${fmtNum(points)} puncte · nicio reducere disponibilă acum`}
            </p>
          </div>
        </div>
        {possible > 0 && <Toggle checked={usePoints} onChange={setUsePoints} label="Folosește punctele Pago" />}
      </div>

      <dl className="mt-5 flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">{items.length > 1 ? `Subtotal (${plural(items.length, "plată", "plăți")})` : "Subtotal"}</dt>
          <dd className="font-semibold text-ink">{fmtRon(totals.subtotal)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">Reducere din puncte</dt>
            <dd className="font-semibold text-success">−{fmtRon(totals.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted">Comision Pago</dt>
          <dd className="font-semibold text-success">0 RON</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-base">
          <dt className="font-bold text-ink">Total</dt>
          <dd className="font-extrabold text-ink">{fmtRon(totals.total)}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <InfoNote icon={ShieldCheck}>
          {items.length === 1
            ? `Pe extrasul bancar plata apare ca ${payeeLabel(items[0].title)}. Primești chitanța imediat ce furnizorul o confirmă.`
            : "Fiecare plată apare separat pe extrasul bancar, cu prefixul PAGO*. Primești câte o chitanță pentru fiecare."}
        </InfoNote>
      </div>
    </Sheet>
  );
}
