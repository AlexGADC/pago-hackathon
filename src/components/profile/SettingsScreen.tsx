"use client";

import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { Card, SectionTitle } from "@/components/shared/Card";
import { Chip, Field, InfoNote, Toggle } from "@/components/shared/Controls";
import { PageHeader } from "@/components/shared/PageHeader";
import { useFamily } from "@/context/FamilyContext";
import { fmtRon } from "@/lib/disputes";
import { THRESHOLD_CHOICES, thresholdLabel } from "@/lib/reminders";
import type { NotificationChannels } from "@/types/pago";

const CHANNELS: { key: keyof NotificationChannels; title: string; text: string }[] = [
  { key: "push", title: "Notificări pe telefon", text: "Apar imediat, chiar dacă aplicația e închisă" },
  { key: "email", title: "E-mail", text: "Confirmarea fiecărei plăți și chitanța" },
  { key: "sms", title: "SMS", text: "Doar pentru plăți eșuate și întârzieri" },
];

function BudgetCard() {
  const { settings, updateSettings, toast } = useFamily();
  const [budgetText, setBudgetText] = useState(settings.monthlyBudget ? String(settings.monthlyBudget) : "");

  function saveBudget() {
    const value = Number(budgetText.replace(",", "."));
    if (budgetText.trim() === "" || !Number.isFinite(value) || value <= 0) {
      updateSettings({ monthlyBudget: null });
      setBudgetText("");
      toast("Bugetul lunar a fost scos", "info");
      return;
    }
    updateSettings({ monthlyBudget: value });
    toast(`Buget lunar: ${fmtRon(value)}`);
  }

  return (
    <Card>
      <Field label="Cât vrei să cheltui pe lună (RON)" hint="Te anunțăm când plățile lunii depășesc bugetul. Lasă gol dacă nu vrei buget.">
        <input inputMode="decimal" value={budgetText} onChange={(e) => setBudgetText(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="ex: 3000" className="field-input" />
      </Field>
      <button onClick={saveBudget} className="btn-soft mt-3 w-full text-sm">
        Salvează bugetul
      </button>
    </Card>
  );
}

export function SettingsScreen() {
  const { settings, hydrated, updateSettings, toast } = useFamily();

  function toggleThreshold(days: number) {
    const has = settings.reminderDays.includes(days);
    if (has && settings.reminderDays.length === 1) {
      toast("Păstrează cel puțin un reminder", "info");
      return;
    }
    const next = has ? settings.reminderDays.filter((d) => d !== days) : [...settings.reminderDays, days];
    updateSettings({ reminderDays: next.sort((a, b) => b - a) });
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="Setări" back="/profil" />

      <SectionTitle>Remindere înainte de scadență</SectionTitle>
      <Card>
        <p className="text-sm text-muted">Alege când vrei să fii anunțat. Reminderele apar pe Acasă și în Notificări.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {THRESHOLD_CHOICES.map((days) => (
            <Chip key={days} active={settings.reminderDays.includes(days)} onClick={() => toggleThreshold(days)}>
              {thresholdLabel(days)}
            </Chip>
          ))}
        </div>
      </Card>

      <SectionTitle>Unde primești notificările</SectionTitle>
      <Card className="flex flex-col divide-y divide-line">
        {CHANNELS.map(({ key, title, text }) => (
          <div key={key} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="font-semibold text-ink">{title}</p>
              <p className="text-xs text-muted">{text}</p>
            </div>
            <Toggle checked={settings.channels[key]} onChange={(value) => updateSettings({ channels: { ...settings.channels, [key]: value } })} label={title} />
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 py-3 last:pb-0">
          <div className="min-w-0">
            <p className="font-semibold text-ink">Rezumat lunar</p>
            <p className="text-xs text-muted">Pe 1 ale lunii: ce ai plătit și ce urmează</p>
          </div>
          <Toggle checked={settings.monthlySummary} onChange={(value) => updateSettings({ monthlySummary: value })} label="Rezumat lunar" />
        </div>
      </Card>
      <InfoNote icon={Fingerprint}>În acest prototip notificările apar doar în aplicație. Alegerile tale sunt salvate pentru versiunea cu notificări reale.</InfoNote>

      <SectionTitle>Buget lunar</SectionTitle>
      <BudgetCard key={hydrated ? "client" : "server"} />

      <SectionTitle>Securitate</SectionTitle>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-ink">Blocare cu amprentă sau PIN</p>
            <p className="text-xs text-muted">Fiecare plată se confirmă cu amprenta, iar aplicația nu se deschide fără tine.</p>
          </div>
          <Toggle
            checked={settings.appLock}
            onChange={(value) => {
              updateSettings({ appLock: value });
              toast(value ? "Blocarea aplicației este activă" : "Blocarea aplicației a fost oprită", value ? "success" : "info");
            }}
            label="Blocare cu amprentă sau PIN"
          />
        </div>
      </Card>
    </div>
  );
}
