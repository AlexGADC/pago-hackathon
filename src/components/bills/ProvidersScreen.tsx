"use client";

import { useState } from "react";
import { History, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { ConnectionBadge } from "@/components/payments/PaymentStatus";
import { BrandBadge } from "@/components/shared/Badges";
import { Card, SectionTitle } from "@/components/shared/Card";
import { Chip, Field, InfoNote } from "@/components/shared/Controls";
import { PageHeader } from "@/components/shared/PageHeader";
import { Sheet } from "@/components/shared/Sheet";
import { useFamily } from "@/context/FamilyContext";
import { PROVIDER_CATALOG, UTILITY_LABEL, type ProviderTemplate } from "@/data/catalog";
import { fmtRon } from "@/lib/disputes";
import { fmtDateTime } from "@/lib/format";
import { findMissingBill } from "@/lib/notifications";
import type { UtilityKind } from "@/types/pago";

const KINDS: UtilityKind[] = ["curent", "gaz", "apa", "telecom", "salubritate", "intretinere"];

const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function ProvidersScreen() {
  const { house, houseConnections, houseBills, today, reconnect, removeProvider, connectProvider, toast } = useFamily();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<UtilityKind | "toate">("toate");
  const [picked, setPicked] = useState<ProviderTemplate | null>(null);
  const [code, setCode] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const connected = houseConnections.map((c) => c.provider);
  const available = PROVIDER_CATALOG.filter((p) => !connected.includes(p.name))
    .filter((p) => kind === "toate" || p.kind === kind)
    .filter((p) => plain(p.name).includes(plain(query.trim())));

  function connect() {
    if (!picked || code.trim().length < 3) return;
    connectProvider(picked, house.id, code.trim());
    toast(`${picked.name} se sincronizează`, "info");
    setPicked(null);
    setCode("");
    setQuery("");
  }

  function remove(provider: string) {
    removeProvider(provider, house.id);
    toast(`${provider} a fost eliminat`, "info");
    setRemoving(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="Furnizori" subtitle={house.name} back="/facturi" />

      <InfoNote icon={History}>
        Conectezi un furnizor o singură dată. Dacă se deconectează, istoricul plăților rămâne păstrat și îl reconectezi dintr-o atingere, fără să îl ștergi.
      </InfoNote>

      <SectionTitle>Conectați ({houseConnections.length})</SectionTitle>
      {houseConnections.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Încă nu ai conectat niciun furnizor pentru {house.name}. Alege unul din lista de mai jos.</p>
        </Card>
      ) : (
        <Card className="flex flex-col divide-y divide-line">
          {houseConnections.map((c) => {
            const bill = houseBills.find((b) => b.provider === c.provider);
            const missing = bill ? findMissingBill(bill, houseConnections, today) : null;
            return (
              <div key={c.provider} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <BrandBadge name={c.provider} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{c.provider}</p>
                    <p className="truncate text-xs text-muted">
                      {bill ? `${UTILITY_LABEL[bill.kind]} · cod ${bill.clientCode}` : "Fără facturi"} · sincronizat {fmtDateTime(c.lastSyncAt)}
                    </p>
                    <div className="mt-1">
                      <ConnectionBadge status={c.status} />
                    </div>
                  </div>
                </div>
                {c.problem && <p className="mt-2 text-xs text-alert">{c.problem}</p>}
                {missing && (
                  <p className="mt-2 text-xs font-semibold text-warning">
                    Factura lunii {missing.label} nu a sosit încă. De obicei apare în jurul datei de {missing.usualDay}. Verifică în contul tău de la {c.provider} dacă a fost emisă.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.status === "deconectat" && (
                    <button onClick={() => reconnect(c.provider, c.houseId)} className="pill pill-primary">
                      <RefreshCw size={14} /> Reconectează
                    </button>
                  )}
                  {removing === c.provider ? (
                    <>
                      <button onClick={() => remove(c.provider)} className="pill pill-alert">
                        Da, elimină
                      </button>
                      <button onClick={() => setRemoving(null)} className="pill pill-soft">
                        Renunță
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setRemoving(c.provider)} className="pill pill-soft">
                      <Trash2 size={14} /> Elimină
                    </button>
                  )}
                </div>
                {removing === c.provider && <p className="mt-2 text-xs text-muted">Factura curentă dispare din listă. Plățile deja făcute rămân în Istoric.</p>}
              </div>
            );
          })}
        </Card>
      )}

      <SectionTitle>Adaugă furnizor</SectionTitle>
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4">
        <Search size={18} className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Caută după nume"
          aria-label="Caută furnizor"
          className="h-12 min-w-0 flex-1 bg-transparent font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
        />
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={kind === "toate"} onClick={() => setKind("toate")}>
          Toate
        </Chip>
        {KINDS.map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
            {UTILITY_LABEL[k]}
          </Chip>
        ))}
      </div>

      {available.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Niciun furnizor nu se potrivește căutării. Încearcă alt nume sau altă categorie.</p>
        </Card>
      ) : (
        <Card className="flex flex-col divide-y divide-line">
          {available.map((p) => (
            <button key={p.name} onClick={() => setPicked(p)} className="flex min-h-14 items-center gap-3 py-2.5 text-left first:pt-0 last:pb-0">
              <BrandBadge name={p.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{p.name}</span>
                <span className="block truncate text-xs text-muted">{UTILITY_LABEL[p.kind]}</span>
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-pago-blue">
                <Plus size={18} />
              </span>
            </button>
          ))}
        </Card>
      )}

      <Sheet
        open={picked !== null}
        onClose={() => setPicked(null)}
        title={picked ? `Conectează ${picked.name}` : "Conectează"}
        footer={
          <button onClick={connect} disabled={code.trim().length < 3} className="btn-dark w-full disabled:opacity-50">
            Conectează furnizorul
          </button>
        }
      >
        {picked && (
          <div className="flex flex-col gap-4">
            <Field label={picked.codeLabel} hint={picked.codeHint}>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Scrie codul de pe factură" className="field-input" />
            </Field>
            <InfoNote icon={RefreshCw}>
              După conectare aducem factura curentă (în jur de {fmtRon(picked.amount)}) și istoricul pe 12 luni. Primești notificare la fiecare factură nouă și înainte de scadență.
            </InfoNote>
          </div>
        )}
      </Sheet>
    </div>
  );
}
