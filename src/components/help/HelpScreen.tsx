"use client";

import { useState } from "react";
import { ChevronDown, Clock3, MessageCircle, Search } from "lucide-react";
import { Card, SectionTitle, Tag } from "@/components/shared/Card";
import { Field, InfoNote } from "@/components/shared/Controls";
import { PageHeader } from "@/components/shared/PageHeader";
import { useFamily } from "@/context/FamilyContext";
import { FAQ, SUPPORT_SUBJECTS } from "@/data/catalog";
import { fmtDateTime } from "@/lib/format";

const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function HelpScreen() {
  const { supportTickets, createSupportTicket, toast } = useFamily();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState(SUPPORT_SUBJECTS[0]);
  const [message, setMessage] = useState("");

  const needle = plain(query.trim());
  const entries = FAQ.filter((entry) => !needle || plain(`${entry.question} ${entry.answer}`).includes(needle));
  const valid = message.trim().length >= 10;

  function send() {
    if (!valid) return;
    createSupportTicket(subject, message.trim());
    toast("Mesaj trimis. Îți răspundem aici.");
    setMessage("");
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="Ajutor și suport" back="/profil" />

      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4">
        <Search size={18} className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Caută în întrebări"
          aria-label="Caută în întrebările frecvente"
          className="h-12 min-w-0 flex-1 bg-transparent font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
        />
      </div>

      <SectionTitle>Întrebări frecvente</SectionTitle>
      {entries.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nu am găsit nimic pentru „{query}”. Scrie-ne mai jos și te ajutăm direct.</p>
        </Card>
      ) : (
        <Card className="flex flex-col divide-y divide-line py-2">
          {entries.map((entry) => (
            <details key={entry.question} className="group py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {entry.question}
                <ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-3 text-sm leading-relaxed text-muted">{entry.answer}</p>
            </details>
          ))}
        </Card>
      )}

      <SectionTitle>Scrie-ne</SectionTitle>
      <Card className="flex flex-col gap-4">
        <InfoNote icon={Clock3}>Îți răspunde un om din echipă, direct în aplicație. De luni până vineri, între 9 și 18, de obicei în mai puțin de două ore.</InfoNote>
        <Field label="Despre ce e vorba?">
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="field-input">
            {SUPPORT_SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mesajul tău" hint="Dacă e vorba de o plată, scrie și referința din chitanță (PG-…).">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Spune-ne pe scurt ce s-a întâmplat" className="field-input resize-none" />
        </Field>
        <button onClick={send} disabled={!valid} className="btn-dark w-full disabled:opacity-50">
          <MessageCircle size={16} /> Trimite mesajul
        </button>
      </Card>

      {supportTickets.length > 0 && (
        <>
          <SectionTitle>Mesajele tale</SectionTitle>
          {supportTickets.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-ink">{t.subject}</p>
                  <p className="text-xs text-muted">{fmtDateTime(t.createdAt)}</p>
                </div>
                <Tag tone={t.status === "raspuns" ? "green" : "orange"}>{t.status === "raspuns" ? "Am răspuns" : "Trimis"}</Tag>
              </div>
              <p className="mt-3 text-sm text-ink">{t.message}</p>
              {t.reply && <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed text-ink">{t.reply}</p>}
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
