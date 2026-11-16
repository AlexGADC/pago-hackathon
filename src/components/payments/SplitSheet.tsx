"use client";

import { useState } from "react";
import { Copy, Share2, Users } from "lucide-react";
import { Field, InfoNote } from "@/components/shared/Controls";
import { Sheet } from "@/components/shared/Sheet";
import { useFamily } from "@/context/FamilyContext";
import { CURRENT_MEMBER_ID } from "@/data/mockFamilyData";
import { round2 } from "@/lib/checkout";
import { fmtRon } from "@/lib/disputes";
import { copyText } from "@/lib/download";
import type { SplitRequest } from "@/types/pago";

export function SplitSheet({ open, onClose, defaultTitle = "", defaultTotal }: { open: boolean; onClose: () => void; defaultTitle?: string; defaultTotal?: number }) {
  if (!open) return null;
  return <SplitForm onClose={onClose} defaultTitle={defaultTitle} defaultTotal={defaultTotal} />;
}

function SplitForm({ onClose, defaultTitle, defaultTotal }: { onClose: () => void; defaultTitle: string; defaultTotal?: number }) {
  const { members, house, createSplit, toast } = useFamily();
  const people = members.filter((m) => !m.pending);
  const [title, setTitle] = useState(defaultTitle);
  const [totalText, setTotalText] = useState(defaultTotal ? String(defaultTotal) : "");
  const [selected, setSelected] = useState<string[]>(people.filter((m) => m.role === "admin").map((m) => m.id));
  const [created, setCreated] = useState<SplitRequest | null>(null);

  const total = Number(totalText.replace(",", "."));
  const valid = title.trim().length > 1 && Number.isFinite(total) && total > 0 && selected.length >= 2;
  const share = selected.length ? round2(total / selected.length) : 0;

  function toggle(id: string) {
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  function create() {
    if (!valid) return;
    const chosen = people.filter((m) => selected.includes(m.id));
    const shares = chosen.map((m, index) => ({
      name: m.name,
      memberId: m.id,
      amount: index === chosen.length - 1 ? round2(total - share * (chosen.length - 1)) : share,
      paid: m.id === CURRENT_MEMBER_ID,
    }));
    setCreated(createSplit({ houseId: house.id, title: title.trim(), total, shares }));
    toast("Cheltuiala a fost împărțită");
  }

  async function copy() {
    if (!created) return;
    const ok = await copyText(created.link);
    toast(ok ? "Link copiat" : "Nu am putut copia linkul", ok ? "success" : "alert");
  }

  async function share_() {
    if (!created) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: created.title, text: `Partea ta din „${created.title}” este ${fmtRon(share)}.`, url: created.link });
        return;
      } catch {
        return;
      }
    }
    await copy();
  }

  if (created) {
    return (
      <Sheet open onClose={onClose} title="Link de plată creat">
        <p className="text-sm text-muted">
          Trimite linkul celor cu care împarți „{created.title}”. Pot plăti partea lor cu cardul, fără cont Pago.
        </p>
        <div className="mt-4 rounded-2xl bg-surface-2 p-4">
          <p className="break-all font-mono text-sm font-semibold text-ink">{created.link}</p>
        </div>
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {created.shares.map((s) => (
            <li key={s.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="font-semibold text-ink">{s.name}</span>
              <span className="text-muted">
                {fmtRon(s.amount)} · <span className={s.paid ? "font-semibold text-success" : "font-semibold text-warning"}>{s.paid ? "plătit" : "în așteptare"}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={copy} className="btn-soft">
            <Copy size={16} /> Copiază
          </button>
          <button onClick={share_} className="btn-dark">
            <Share2 size={16} /> Trimite
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Împarte o cheltuială"
      footer={
        <button onClick={create} disabled={!valid} className="btn-dark w-full disabled:opacity-50">
          <Users size={16} /> Creează linkul de plată
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Ce împarți?">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Întreținere noiembrie" className="field-input" />
        </Field>
        <Field label="Suma totală (RON)">
          <input inputMode="decimal" value={totalText} onChange={(e) => setTotalText(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="0" className="field-input" />
        </Field>
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Cu cine?</p>
          <div className="flex flex-wrap gap-2">
            {people.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={selected.includes(m.id)}
                onClick={() => toggle(m.id)}
                className={`pill ${selected.includes(m.id) ? "pill-primary" : "pill-soft"}`}
              >
                <span aria-hidden>{m.avatar}</span> {m.name}
              </button>
            ))}
          </div>
        </div>
        {valid ? (
          <InfoNote icon={Users} tone="success">
            Suma se împarte egal, câte {fmtRon(share)} de persoană. Partea ta este marcată automat ca plătită.
          </InfoNote>
        ) : (
          <InfoNote icon={Users}>Alege cel puțin două persoane. Suma se împarte în mod egal.</InfoNote>
        )}
      </div>
    </Sheet>
  );
}
