"use client";

import { useState } from "react";
import { Copy, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { SplitSheet } from "@/components/payments/SplitSheet";
import { Card, SectionTitle, Tag } from "@/components/shared/Card";
import { Field, Segmented } from "@/components/shared/Controls";
import { PageHeader } from "@/components/shared/PageHeader";
import { Sheet } from "@/components/shared/Sheet";
import { useFamily } from "@/context/FamilyContext";
import { pointsValue } from "@/lib/checkout";
import { fmtNum, fmtRon } from "@/lib/disputes";
import { copyText } from "@/lib/download";
import { fmtDate } from "@/lib/format";
import type { MemberRole } from "@/types/pago";

const ROLE_LABEL: Record<MemberRole, string> = { admin: "Părinte", junior: "Junior", protejat: "Profil protejat" };

const ROLE_TEXT: Record<MemberRole, string> = {
  admin: "Vede tot, plătește și aprobă.",
  junior: "Fără carduri: doar misiuni și puncte.",
  protejat: "Facturile lui sunt verificate și plătite de părinți.",
};

const ROLES: { value: MemberRole; label: string }[] = [
  { value: "admin", label: "Părinte" },
  { value: "junior", label: "Junior" },
  { value: "protejat", label: "Protejat" },
];

export function FamilyScreen() {
  const { members, missions, splits, points, house, completeMission, inviteMember, removeMember, toggleShare, removeSplit, toast } = useFamily();
  const [inviting, setInviting] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("admin");
  const houseSplits = splits.filter((s) => s.houseId === house.id);

  function invite() {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    inviteMember({ name: trimmed, role, avatar: role === "junior" ? "🧒" : role === "protejat" ? "🧓" : "🙂" });
    toast(`Invitație trimisă către ${trimmed}`);
    setName("");
    setInviting(false);
  }

  async function copy(link: string) {
    const ok = await copyText(link);
    toast(ok ? "Link copiat" : "Nu am putut copia linkul", ok ? "success" : "alert");
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title="Familie"
        back="/profil"
        action={
          <button onClick={() => setInviting(true)} className="pill pill-primary shrink-0">
            <UserPlus size={14} /> Invită
          </button>
        }
      />

      <section className="rounded-card bg-card-gradient p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Punctele familiei</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight">{fmtNum(points)}</p>
        <p className="mt-1 text-sm text-white/90">Valorează {fmtRon(pointsValue(points))} reducere la plăți. Le strângeți împreună, din plăți și misiuni.</p>
      </section>

      <SectionTitle>Membri</SectionTitle>
      <Card className="flex flex-col divide-y divide-line">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-2xl" aria-hidden>
              {m.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{m.name}</p>
              <p className="truncate text-xs text-muted">
                {ROLE_LABEL[m.role]} · {ROLE_TEXT[m.role]}
              </p>
            </div>
            {m.pending ? (
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Tag tone="orange">Invitat</Tag>
                <button onClick={() => removeMember(m.id)} className="text-xs font-semibold text-muted underline">
                  Retrage
                </button>
              </div>
            ) : (
              <span className="shrink-0 text-sm font-bold text-family-coral">{fmtNum(m.points)} pct</span>
            )}
          </div>
        ))}
      </Card>

      <SectionTitle
        action={
          <button onClick={() => setSplitting(true)} className="pill pill-soft">
            <Plus size={14} /> Împarte
          </button>
        }
      >
        Cheltuieli împărțite
      </SectionTitle>
      {houseSplits.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Împarte o factură sau un abonament și trimite un link de plată. Ceilalți plătesc partea lor fără cont Pago.</p>
        </Card>
      ) : (
        houseSplits.map((s) => {
          const settled = s.shares.every((share) => share.paid);
          return (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">{s.title}</p>
                  <p className="text-xs text-muted">
                    {fmtRon(s.total)} · {fmtDate(s.createdAt)}
                  </p>
                </div>
                <Tag tone={settled ? "green" : "orange"}>{settled ? "Încheiat" : "În așteptare"}</Tag>
              </div>
              <ul className="mt-3 flex flex-col divide-y divide-line">
                {s.shares.map((share, index) => (
                  <li key={share.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate font-semibold text-ink">
                      {share.name} · <span className="font-normal text-muted">{fmtRon(share.amount)}</span>
                    </span>
                    <button onClick={() => toggleShare(s.id, index)} aria-pressed={share.paid} className={`pill shrink-0 ${share.paid ? "pill-primary" : "pill-soft"}`}>
                      {share.paid ? "Plătit" : "Marchează plătit"}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => copy(s.link)} className="pill pill-soft">
                  <Copy size={14} /> Copiază linkul
                </button>
                <button
                  onClick={() => {
                    removeSplit(s.id);
                    toast("Împărțirea a fost ștearsă", "info");
                  }}
                  className="pill pill-soft"
                >
                  <Trash2 size={14} /> Șterge
                </button>
              </div>
            </Card>
          );
        })
      )}

      <SectionTitle>Misiuni</SectionTitle>
      {missions.map((m) => (
        <Card key={m.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-ink">{m.title}</p>
              <p className="text-sm text-muted">{m.description}</p>
            </div>
            <span className="shrink-0 rounded-full bg-family-indigo/10 px-2.5 py-0.5 text-xs font-bold text-family-indigo">+{m.points}</span>
          </div>
          <button disabled={m.completed} onClick={() => completeMission(m.id)} className={`mt-3 w-full text-sm ${m.completed ? "btn-soft text-success" : "btn-dark"}`}>
            {m.completed ? "Finalizată ✓" : "Marchează finalizată (demo)"}
          </button>
        </Card>
      ))}

      <Sheet
        open={inviting}
        onClose={() => setInviting(false)}
        title="Invită un membru"
        footer={
          <button onClick={invite} disabled={name.trim().length < 2} className="btn-dark w-full disabled:opacity-50">
            <Users size={16} /> Trimite invitația
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Prenume">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Andrei" className="field-input" />
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-semibold text-ink">Rol</p>
            <Segmented value={role} onChange={setRole} options={ROLES} label="Rolul membrului" />
            <p className="mt-2 text-xs text-muted">{ROLE_TEXT[role]}</p>
          </div>
        </div>
      </Sheet>

      <SplitSheet open={splitting} onClose={() => setSplitting(false)} />
    </div>
  );
}
