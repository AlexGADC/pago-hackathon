"use client";

import { useState } from "react";
import { CreditCard, Lock, Plus, ShieldCheck } from "lucide-react";
import { Card, Tag } from "@/components/shared/Card";
import { EmptyState, Field, InfoNote, Toggle } from "@/components/shared/Controls";
import { PageHeader } from "@/components/shared/PageHeader";
import { Sheet } from "@/components/shared/Sheet";
import { useFamily } from "@/context/FamilyContext";
import { cardBrandLabel, cardExpiryLabel, isCardExpired } from "@/lib/checkout";
import { plural } from "@/lib/format";
import type { CardBrand } from "@/types/pago";

function brandOf(digits: string): CardBrand | null {
  if (digits.startsWith("4")) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  return null;
}

export function CardsScreen() {
  const { methods, autopay, today, setDefaultMethod, removeMethod, toast } = useFamily();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title="Carduri"
        back="/profil"
        action={
          <button onClick={() => setAdding(true)} className="pill pill-primary shrink-0">
            <Plus size={14} /> Adaugă
          </button>
        }
      />

      <InfoNote icon={Lock}>Pago nu păstrează numărul cardului. Datele stau la procesatorul de plăți, iar aici vezi doar ultimele 4 cifre.</InfoNote>

      {methods.length === 0 ? (
        <EmptyState icon={CreditCard} title="Niciun card salvat" text="Adaugă un card ca să poți plăti facturile, abonamentele și asigurările din aplicație.">
          <button onClick={() => setAdding(true)} className="btn-dark w-full text-sm">
            <Plus size={16} /> Adaugă un card
          </button>
        </EmptyState>
      ) : (
        methods.map((m) => {
          const expired = isCardExpired(m, today);
          const rules = autopay.filter((r) => r.enabled && r.methodId === m.id).length;
          return (
            <Card key={m.id} className={expired ? "opacity-80" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-pago-blue">
                    <CreditCard size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">
                      {cardBrandLabel(m)} •••• {m.last4}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {m.label} · {m.holder} · expiră {cardExpiryLabel(m)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {m.isDefault && <Tag tone="green">Principal</Tag>}
                  {expired && <Tag tone="red">Expirat</Tag>}
                </div>
              </div>
              {rules > 0 && <p className="mt-3 text-xs text-muted">Folosit la {plural(rules, "plată automată", "plăți automate")}.</p>}
              {expired && <p className="mt-3 text-xs font-semibold text-alert">Cardul a expirat și nu mai poate fi folosit la plăți. Adaugă cardul nou și șterge-l pe acesta.</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {!m.isDefault && !expired && (
                  <button
                    onClick={() => {
                      setDefaultMethod(m.id);
                      toast("Card principal schimbat");
                    }}
                    className="pill pill-soft"
                  >
                    Fă-l principal
                  </button>
                )}
                {removing === m.id ? (
                  <>
                    <button
                      onClick={() => {
                        removeMethod(m.id);
                        setRemoving(null);
                        toast("Card șters", "info");
                      }}
                      className="pill pill-alert"
                    >
                      Da, șterge
                    </button>
                    <button onClick={() => setRemoving(null)} className="pill pill-soft">
                      Renunță
                    </button>
                  </>
                ) : (
                  <button onClick={() => setRemoving(m.id)} className="pill pill-soft">
                    Șterge
                  </button>
                )}
              </div>
              {removing === m.id && rules > 0 && <p className="mt-2 text-xs text-muted">Plățile automate de pe acest card trec pe cardul principal.</p>}
            </Card>
          );
        })
      )}

      {adding && <AddCardSheet onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddCardSheet({ onClose }: { onClose: () => void }) {
  const { methods, today, addMethod, toast } = useFamily();
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [holder, setHolder] = useState("");
  const [label, setLabel] = useState("");
  const [makeDefault, setMakeDefault] = useState(methods.length === 0);

  const digits = number.replace(/\D/g, "");
  const brand = brandOf(digits);
  const numberValid = digits.length >= 13 && digits.length <= 19 && brand !== null;
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  const expMonth = match ? Number(match[1]) : 0;
  const expYear = match ? 2000 + Number(match[2]) : 0;
  const expiryValid = expMonth >= 1 && expMonth <= 12 && !isCardExpired({ id: "", brand: "visa", last4: "", holder: "", label: "", isDefault: false, expMonth, expYear }, today);
  const valid = numberValid && expiryValid && holder.trim().length >= 3;

  function formatNumber(value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 19);
    setNumber(clean.replace(/(.{4})/g, "$1 ").trim());
  }

  function formatExpiry(value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 4);
    setExpiry(clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean);
  }

  function save() {
    if (!valid || !brand) return;
    addMethod({ brand, last4: digits.slice(-4), holder: holder.trim(), expMonth, expYear, label: label.trim() || "Card nou", isDefault: makeDefault });
    toast("Card adăugat");
    onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Adaugă un card"
      footer={
        <button onClick={save} disabled={!valid} className="btn-dark w-full disabled:opacity-50">
          Salvează cardul
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <InfoNote icon={ShieldCheck} tone="warning">
          Acesta este un prototip. Nu introduce datele unui card real: poți scrie orice număr care începe cu 4 sau 5. Păstrăm doar ultimele 4 cifre.
        </InfoNote>
        <Field label="Numărul cardului" error={digits.length >= 13 && !brand ? "Acceptăm carduri Visa și Mastercard." : null}>
          <input inputMode="numeric" autoComplete="off" value={number} onChange={(e) => formatNumber(e.target.value)} placeholder="4000 0000 0000 0000" className="field-input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expiră (LL/AA)" error={expiry.length === 5 && !expiryValid ? "Data nu este validă." : null}>
            <input inputMode="numeric" autoComplete="off" value={expiry} onChange={(e) => formatExpiry(e.target.value)} placeholder="08/29" className="field-input" />
          </Field>
          <Field label="Denumire">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex: Card comun" className="field-input" />
          </Field>
        </div>
        <Field label="Numele de pe card">
          <input autoComplete="off" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Prenume Nume" className="field-input" />
        </Field>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-4">
          <p className="text-sm font-semibold text-ink">Folosește-l ca principal</p>
          <Toggle checked={makeDefault} onChange={setMakeDefault} label="Card principal" />
        </div>
      </div>
    </Sheet>
  );
}
