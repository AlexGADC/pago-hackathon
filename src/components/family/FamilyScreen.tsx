"use client";

// TAB 3 — Familie & Misiuni. Schelet legat la context.
// TODO (frontend): MissionAutocitire cu poză + SplitModal (shared) cu link copiabil.

import { Card, SectionTitle } from "@/components/shared/Card";
import { useFamily } from "@/context/FamilyContext";
import { familyMembers } from "@/data/mockFamilyData";

const ROLE_LABEL = { admin: "Părinte", junior: "Junior", protejat: "Profil protejat" } as const;

export function FamilyScreen() {
  const { missions, completeMission } = useFamily();

  return (
    <div>
      <SectionTitle>Membrii familiei</SectionTitle>
      <Card className="flex flex-col gap-3">
        {familyMembers.map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <span className="text-2xl">{m.avatar}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{m.name}</p>
              <p className="text-xs text-slate-500">{ROLE_LABEL[m.role]}</p>
            </div>
            <span className="text-sm font-bold text-family-coral">{m.points} pct</span>
          </div>
        ))}
      </Card>

      <SectionTitle>Misiuni</SectionTitle>
      <div className="flex flex-col gap-3">
        {missions.map((m) => (
          <Card key={m.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">{m.title}</p>
                <p className="text-sm text-slate-500">{m.description}</p>
              </div>
              <span className="shrink-0 rounded-full bg-family-indigo/10 px-2.5 py-0.5 text-xs font-bold text-family-indigo">+{m.points}</span>
            </div>
            <button
              disabled={m.completed}
              onClick={() => completeMission(m.id)}
              className="mt-3 w-full rounded-xl bg-family-indigo py-2 text-sm font-semibold text-white disabled:bg-success"
            >
              {m.completed ? "Finalizată ✓" : "Marchează finalizată (demo)"}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
