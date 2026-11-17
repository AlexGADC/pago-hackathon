"use client";

import { useState } from "react";
import { BarChart3, Bell, BadgeCheck, CreditCard, Download, History, LifeBuoy, Plug, RotateCcw, Sparkles, Users, Zap } from "lucide-react";
import { AccountCard } from "@/components/auth/AccountCard";
import { AvatarImage } from "@/components/shared/Badges";
import { Card, SectionTitle } from "@/components/shared/Card";
import { MenuRow } from "@/components/shared/Controls";
import { PageHeader } from "@/components/shared/PageHeader";
import { Sheet } from "@/components/shared/Sheet";
import { useFamily } from "@/context/FamilyContext";
import { FAMILY_NAME } from "@/data/mockFamilyData";
import { pointsValue } from "@/lib/checkout";
import { fmtNum, fmtRon } from "@/lib/disputes";
import { downloadText } from "@/lib/download";
import { plural } from "@/lib/format";

const PLAN_POINTS = [
  "Plăți nelimitate, fără plafon lunar",
  "Comision 0 la facturi, abonamente și asigurări",
  "Dacă un serviciu are vreodată un cost, îl vezi înainte să confirmi plata",
  "Istoricul și chitanțele rămân ale tale, cu export oricând",
];

export function ProfileScreen() {
  const family = useFamily();
  const { house, houses, activeHouse, points, methods, autopay, members, houseConnections, setActiveHouse, resetDemo, toast, today } = family;
  const [confirmReset, setConfirmReset] = useState(false);
  const activeRules = autopay.filter((r) => r.enabled).length;

  function exportData() {
    const data = {
      exportat: today,
      profiluri: family.houses,
      facturi: family.bills,
      abonamente: family.subscriptions,
      asigurari: family.expiries,
      plati: family.payments,
      platiAutomate: family.autopay,
      setari: family.settings,
    };
    downloadText(`pago-date-${today}.json`, JSON.stringify(data, null, 2), "application/json");
    toast("Datele tale au fost exportate");
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="Contul meu" subtitle={FAMILY_NAME} back="/" />

      <Card>
        <div className="flex items-center gap-4">
          <span className="size-16 shrink-0 overflow-hidden rounded-full ring-2 ring-line">
            <AvatarImage src={house.avatar} size={64} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold text-ink">{house.name}</p>
            <p className="truncate text-sm text-muted">{house.address}</p>
          </div>
        </div>
        {houses.length > 1 && (
          <div className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1">
            {houses.map((h) => (
              <button key={h.id} onClick={() => setActiveHouse(h.id)} aria-pressed={activeHouse === h.id} className={`pill shrink-0 ${activeHouse === h.id ? "pill-primary" : "pill-soft"}`}>
                {h.name}
              </button>
            ))}
          </div>
        )}
      </Card>

      <AccountCard />

      <section className="rounded-card bg-card-gradient p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Puncte Pago</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight">{fmtNum(points)}</p>
        <p className="mt-1 text-sm text-white/90">Valorează {fmtRon(pointsValue(points))} reducere la următoarele plăți.</p>
        <p className="mt-3 text-xs text-white/80">Câștigi 1 punct la fiecare 10 RON plătiți din aplicație, plus bonusuri pentru misiunile familiei.</p>
      </section>

      <SectionTitle>Plăți</SectionTitle>
      <Card className="flex flex-col divide-y divide-line py-2">
        <MenuRow href="/profil/carduri" icon={CreditCard} title="Carduri" subtitle={plural(methods.length, "card salvat", "carduri salvate")} />
        <MenuRow href="/profil/plati-automate" icon={Zap} title="Plăți automate" subtitle={activeRules ? `${plural(activeRules, "activă", "active")}, cu limită de siguranță` : "Nicio plată automată"} />
        <MenuRow href="/istoric" icon={History} title="Istoric plăți" subtitle="Chitanțe, căutare și export" />
        <MenuRow href="/servicii" icon={Sparkles} title="Alte plăți" subtitle="Reîncărcare, rovinietă, taxă de pod, impozite" />
      </Card>

      <SectionTitle>Casă și familie</SectionTitle>
      <Card className="flex flex-col divide-y divide-line py-2">
        <MenuRow href="/facturi/furnizori" icon={Plug} title="Furnizori conectați" subtitle={plural(houseConnections.length, "furnizor", "furnizori")} />
        <MenuRow href="/familie" icon={Users} title="Familie" subtitle={`${plural(members.length, "membru", "membri")} · cheltuieli împărțite`} />
        <MenuRow href="/statistici" icon={BarChart3} title="Statistici" subtitle="Pe an, pe categorie și buget" />
      </Card>

      <SectionTitle>Aplicație</SectionTitle>
      <Card className="flex flex-col divide-y divide-line py-2">
        <MenuRow href="/profil/setari" icon={Bell} title="Notificări, buget și securitate" subtitle="Remindere, canale, blocare cu amprentă" />
        <MenuRow href="/ajutor" icon={LifeBuoy} title="Ajutor și suport" subtitle="Întrebări frecvente și mesaje către echipă" />
      </Card>

      <Card>
        <p className="flex items-center gap-2 font-bold text-ink">
          <BadgeCheck size={18} className="text-pago-blue" /> Planul tău: Pago Gratuit
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {PLAN_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-ink">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-pago-blue" />
              {point}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={exportData} className="btn-soft text-sm">
          <Download size={16} /> Exportă datele
        </button>
        <button onClick={() => setConfirmReset(true)} className="btn-soft text-sm">
          <RotateCcw size={16} /> Resetează demo
        </button>
      </div>

      <Sheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Resetezi demo-ul?"
        footer={
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                resetDemo();
                setConfirmReset(false);
              }}
              className="btn-dark w-full"
            >
              Da, resetează
            </button>
            <button onClick={() => setConfirmReset(false)} className="btn-soft w-full">
              Renunță
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted">Toate plățile, profilurile și setările făcute până acum se șterg, iar aplicația revine la datele inițiale ale Familiei Popescu. Contul tău rămâne.</p>
      </Sheet>
    </div>
  );
}
