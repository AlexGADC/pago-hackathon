"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldCheck, Zap } from "lucide-react";
import { Card, Tag } from "@/components/shared/Card";
import { Field, InfoNote, Segmented } from "@/components/shared/Controls";
import { Sheet } from "@/components/shared/Sheet";
import { useFamily } from "@/context/FamilyContext";
import { activeRule, ruleFor, suggestedLimit } from "@/lib/autopay";
import { cardLabel, isCardExpired } from "@/lib/checkout";
import { fmtRon } from "@/lib/disputes";
import { daysLabel, fmtDay } from "@/lib/format";
import { upcomingEvent } from "@/lib/payments";
import type { HouseId, TargetKind } from "@/types/pago";

interface AutopayTarget {
  targetId: string;
  targetKind: TargetKind;
  houseId: HouseId;
  name: string;
  typicalAmount: number;
}

const NOTICE_OPTIONS = [
  { value: "1", label: "1 zi" },
  { value: "3", label: "3 zile" },
  { value: "7", label: "7 zile" },
];

export function AutopayCard(target: AutopayTarget) {
  const { autopay, methods, ledger, today, disableAutopay, toast } = useFamily();
  const [open, setOpen] = useState(false);
  const rule = activeRule(autopay, target.targetId);
  const method = methods.find((m) => m.id === rule?.methodId);
  const next = upcomingEvent(ledger, target.houseId, target.targetId, today);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-bold text-ink">
          <Zap size={18} className="text-pago-blue" /> Plată automată
        </p>
        <Tag tone={rule ? "green" : "gray"}>{rule ? "Activă" : "Oprită"}</Tag>
      </div>

      {rule ? (
        <>
          <p className="mt-2 text-sm text-muted">
            Plătim automat la scadență, doar dacă suma este cel mult <b className="text-ink">{fmtRon(rule.maxAmount)}</b>. Te anunțăm cu {daysLabel(rule.noticeDays)} înainte.
          </p>
          <dl className="mt-3 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Card</dt>
              <dd className="font-semibold text-ink">{method ? cardLabel(method) : "Card șters"}</dd>
            </div>
            {next && next.autopay === "scheduled" && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Următoarea plată</dt>
                <dd className="font-semibold text-ink">
                  {next.estimated ? "≈ " : ""}
                  {fmtRon(next.amount)} · {fmtDay(next.date)}
                </dd>
              </div>
            )}
          </dl>
          {next && next.autopay === "blocked" && (
            <div className="mt-3">
              <InfoNote icon={ShieldCheck} tone="warning">
                {next.flagged
                  ? "Factura curentă pare greșită, așa că nu o plătim automat. Verific-o și decide tu."
                  : `Plata din ${fmtDay(next.date)} este de ${fmtRon(next.amount)}, peste limita ta. Nu se face automat: verific-o și plătește manual dacă e corectă.`}
              </InfoNote>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => setOpen(true)} className="btn-soft text-sm">
              Modifică
            </button>
            <button
              onClick={() => {
                disableAutopay(target.targetId, target.name);
                toast("Plata automată a fost oprită", "info");
              }}
              className="btn-soft text-sm text-alert"
            >
              Oprește
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">Nu mai ții minte scadența. Stabilești o limită de siguranță, iar dacă suma o depășește, plata se oprește și decizi tu.</p>
          <button onClick={() => setOpen(true)} className="btn-dark mt-4 w-full text-sm">
            <Zap size={16} /> Activează plata automată
          </button>
        </>
      )}

      {open && <AutopaySheet target={target} onClose={() => setOpen(false)} />}
    </Card>
  );
}

function AutopaySheet({ target, onClose }: { target: AutopayTarget; onClose: () => void }) {
  const { autopay, methods, defaultMethod, today, saveAutopay, toast } = useFamily();
  const existing = ruleFor(autopay, target.targetId);
  const usable = methods.filter((m) => !isCardExpired(m, today));
  const initialMethod = usable.find((m) => m.id === existing?.methodId) ?? usable.find((m) => m.id === defaultMethod?.id) ?? usable[0];

  const [limitText, setLimitText] = useState(String(existing?.maxAmount ?? suggestedLimit(target.typicalAmount)));
  const [methodId, setMethodId] = useState(initialMethod?.id ?? "");
  const [notice, setNotice] = useState(String(existing?.noticeDays ?? 3));
  const [consent, setConsent] = useState(false);

  const limit = Number(limitText.replace(",", "."));
  const limitValid = Number.isFinite(limit) && limit > 0;
  const tooLow = limitValid && limit < target.typicalAmount;
  const valid = limitValid && Boolean(methodId) && consent;

  function save() {
    if (!valid) return;
    saveAutopay({ targetId: target.targetId, targetKind: target.targetKind, maxAmount: limit, methodId, noticeDays: Number(notice), name: target.name });
    toast("Plata automată este activă");
    onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Plată automată · ${target.name}`}
      footer={
        <button onClick={save} disabled={!valid} className="btn-dark w-full disabled:opacity-50">
          Activează plata automată
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Limită de siguranță (RON)"
          hint={tooLow ? undefined : `De obicei plătești în jur de ${fmtRon(target.typicalAmount)}. Peste limită, plata nu se face automat.`}
          error={tooLow ? `Limita e sub suma obișnuită (${fmtRon(target.typicalAmount)}), deci plata automată s-ar opri de fiecare dată.` : null}
        >
          <input inputMode="decimal" value={limitText} onChange={(e) => setLimitText(e.target.value.replace(/[^\d.,]/g, ""))} className="field-input" />
        </Field>

        {usable.length === 0 ? (
          <InfoNote icon={ShieldCheck} tone="warning">
            Nu ai niciun card valabil.{" "}
            <Link href="/profil/carduri" onClick={onClose} className="font-bold underline">
              Adaugă un card
            </Link>{" "}
            ca să poți activa plata automată.
          </InfoNote>
        ) : (
          <Field label="Card folosit">
            <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className="field-input">
              {usable.map((m) => (
                <option key={m.id} value={m.id}>
                  {cardLabel(m)} · {m.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">Te anunțăm înainte cu</p>
          <Segmented value={notice} onChange={setNotice} options={NOTICE_OPTIONS} label="Anunț înainte de plată" />
        </div>

        <label className="flex items-start gap-3 rounded-2xl bg-surface-2 p-4 text-sm text-ink">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-pago-blue" />
          <span>
            Sunt de acord ca Pago să plătească automat <b>{target.name}</b> la scadență, în limita stabilită. Pot opri plata automată oricând, fără costuri.
          </span>
        </label>
      </div>
    </Sheet>
  );
}
