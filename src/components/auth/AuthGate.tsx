"use client";

import { useState, type FormEvent } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Field, Segmented } from "@/components/shared/Controls";
import { session, useSession } from "@/context/session";

type Tab = "login" | "register";

const TABS: { value: Tab; label: string }[] = [
  { value: "login", label: "Am cont" },
  { value: "register", label: "Cont nou" },
];

export function AuthGate() {
  const { status } = useSession();
  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "user" || status === "local") return null;

  if (status === "loading") {
    return (
      <div aria-busy="true" aria-label="Se încarcă" className="absolute inset-0 z-[35] grid place-items-center bg-app">
        <span className="text-3xl font-extrabold lowercase tracking-tight text-pago-blue">pago</span>
      </div>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const problem = tab === "login" ? await session.login(email, password) : await session.register(name, email, password);
    setBusy(false);
    if (problem) setError(problem);
    else setPassword("");
  }

  function pick(next: Tab) {
    setTab(next);
    setError(null);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Intră în cont" className="absolute inset-0 z-[35] flex flex-col overflow-y-auto bg-app px-5 pb-6 pt-8">
      <span className="text-2xl font-extrabold lowercase tracking-tight text-pago-blue">pago</span>
      <h1 className="mt-6 text-2xl font-extrabold leading-tight text-ink">{tab === "login" ? "Bine ai revenit" : "Hai să îți facem cont"}</h1>
      <p className="mt-1 text-sm text-muted">Cu un cont, plățile și setările tale rămân salvate și le vezi de pe orice dispozitiv.</p>

      <div className="mt-5">
        <Segmented label="Tip de acces" options={TABS} value={tab} onChange={pick} />
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
        {tab === "register" && (
          <Field label="Numele tău">
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Prenume Nume" className="field-input" required minLength={2} maxLength={60} />
          </Field>
        )}
        <Field label="E-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="nume@exemplu.ro" className="field-input" required />
        </Field>
        <Field label="Parolă" hint={tab === "register" ? "Cel puțin 8 caractere." : undefined}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            className="field-input"
            required
            minLength={tab === "register" ? 8 : 1}
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-2xl bg-alert-bg px-3 py-2 text-sm font-semibold text-alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-dark mt-1 w-full disabled:opacity-60">
          <LockKeyhole size={16} /> {busy ? "Un moment…" : tab === "login" ? "Intră în cont" : "Creează contul"}
        </button>
      </form>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-pago-blue" />
        Parola este păstrată criptat. Plățile din acest prototip sunt simulate, nu se iau bani de pe niciun card.
      </p>

      <button type="button" onClick={() => session.useLocal()} className="mt-auto pt-6 text-center text-sm font-semibold text-pago-blue">
        Încearcă fără cont
      </button>
      <p className="mt-1 text-center text-xs text-muted">Datele rămân doar pe acest dispozitiv.</p>
    </div>
  );
}
