"use client";

import { useState } from "react";
import { CloudOff, KeyRound, LogOut, Trash2, UserRound } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { Field } from "@/components/shared/Controls";
import { Sheet } from "@/components/shared/Sheet";
import { useFamily } from "@/context/FamilyContext";
import { session, useSession } from "@/context/session";
import { fmtDate } from "@/lib/format";

type Panel = "password" | "delete" | null;

export function AccountCard() {
  const { status, user } = useSession();
  const { toast } = useFamily();
  const [panel, setPanel] = useState<Panel>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function open(target: Panel) {
    setCurrent("");
    setNext("");
    setError(null);
    setPanel(target);
  }

  async function savePassword() {
    setBusy(true);
    const problem = await session.changePassword(current, next);
    setBusy(false);
    if (problem) {
      setError(problem);
      return;
    }
    setPanel(null);
    toast("Parola a fost schimbată");
  }

  async function removeAccount() {
    setBusy(true);
    const problem = await session.deleteAccount(current);
    setBusy(false);
    if (problem) {
      setError(problem);
      return;
    }
    setPanel(null);
  }

  if (status === "local") {
    return (
      <Card>
        <p className="flex items-center gap-2 font-bold text-ink">
          <CloudOff size={18} className="text-warning" /> Folosești aplicația fără cont
        </p>
        <p className="mt-1 text-sm text-muted">Datele sunt salvate doar pe acest dispozitiv. Cu un cont le păstrezi și le vezi de oriunde.</p>
        <button onClick={() => session.showSignIn()} className="btn-dark mt-3 w-full text-sm">
          Intră în cont sau creează unul
        </button>
      </Card>
    );
  }

  if (status !== "user" || !user) return null;

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-pago-blue">
          <UserRound size={20} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">Cont creat pe {fmtDate(user.createdAt)}. Datele tale sunt salvate pe server.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => open("password")} className="pill pill-soft">
          <KeyRound size={14} /> Schimbă parola
        </button>
        <button onClick={() => void session.logout()} className="pill pill-soft">
          <LogOut size={14} /> Ieși din cont
        </button>
        <button onClick={() => open("delete")} className="pill pill-alert">
          <Trash2 size={14} /> Șterge contul
        </button>
      </div>

      <Sheet
        open={panel === "password"}
        onClose={() => setPanel(null)}
        title="Schimbă parola"
        footer={
          <button onClick={savePassword} disabled={busy || current.length === 0 || next.length < 8} className="btn-dark w-full disabled:opacity-50">
            Salvează parola nouă
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Parola actuală">
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className="field-input" />
          </Field>
          <Field label="Parola nouă" hint="Cel puțin 8 caractere. Celelalte dispozitive vor fi deconectate." error={error}>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className="field-input" />
          </Field>
        </div>
      </Sheet>

      <Sheet
        open={panel === "delete"}
        onClose={() => setPanel(null)}
        title="Ștergi contul?"
        footer={
          <div className="flex flex-col gap-2">
            <button onClick={removeAccount} disabled={busy || current.length === 0} className="btn-dark w-full disabled:opacity-50">
              Da, șterge contul
            </button>
            <button onClick={() => setPanel(null)} className="btn-soft w-full">
              Renunță
            </button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-muted">Contul, plățile, profilurile și setările se șterg definitiv de pe server. Acțiunea nu poate fi anulată.</p>
        <Field label="Confirmă cu parola" error={error}>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className="field-input" />
        </Field>
      </Sheet>
    </Card>
  );
}
