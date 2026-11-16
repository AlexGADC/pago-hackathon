"use client";

import { useState } from "react";
import { BellRing, ReceiptText, ShieldCheck, type LucideIcon } from "lucide-react";
import { useFamily } from "@/context/FamilyContext";

const SLIDES: { Icon: LucideIcon; title: string; text: string; points: string[] }[] = [
  {
    Icon: ReceiptText,
    title: "Toate plățile casei, într-un singur loc",
    text: "Facturi, abonamente, RCA, rovinietă, ITP și impozite. Le vezi pe toate în calendar și le plătești din aplicație.",
    points: ["Furnizorii se conectează o singură dată", "Plătești tot ce e scadent dintr-o atingere"],
  },
  {
    Icon: BellRing,
    title: "Nu mai ratezi nicio scadență",
    text: "Primești remindere cu 7 zile, 3 zile și în ziua scadenței. Pentru ce vrei tu, activezi plata automată.",
    points: ["Limită de siguranță la plata automată", "Alerte la scumpiri și la finalul perioadelor de probă"],
  },
  {
    Icon: ShieldCheck,
    title: "Știi mereu unde sunt banii tăi",
    text: "Fiecare plată are pași clari până la confirmarea furnizorului, plus chitanță. Comision 0 și nicio limită ascunsă.",
    points: ["Factură suspectă? O contești fără telefoane", "Istoricul rămâne al tău, cu export oricând"],
  },
];

export function Onboarding() {
  const { hydrated, onboardingDone, finishOnboarding } = useFamily();
  const [index, setIndex] = useState(0);

  if (!hydrated || onboardingDone) return null;

  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  return (
    <div role="dialog" aria-modal="true" aria-label="Bun venit în Pago" className="absolute inset-0 z-30 flex flex-col bg-app">
      <div className="flex items-center justify-between px-5 pt-5">
        <span className="text-xl font-extrabold lowercase tracking-tight text-pago-blue">pago</span>
        <button onClick={finishOnboarding} className="pill pill-soft">
          Sari peste
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6">
        <div key={index} className="animate-rise">
          <span className="grid size-24 place-items-center rounded-[32px] bg-hero text-white shadow-float">
            <slide.Icon size={44} />
          </span>
          <h1 className="mt-8 text-3xl font-extrabold leading-tight tracking-tight text-ink">{slide.title}</h1>
          <p className="mt-3 text-base leading-relaxed text-muted">{slide.text}</p>
          <ul className="mt-5 flex flex-col gap-2">
            {slide.points.map((point) => (
              <li key={point} className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="size-2 shrink-0 rounded-full bg-pago-blue" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="px-6 pb-[max(env(safe-area-inset-bottom),24px)]">
        <div className="mb-5 flex justify-center gap-2" aria-hidden>
          {SLIDES.map((_, i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-pago-blue" : "w-2 bg-line"}`} />
          ))}
        </div>
        <button onClick={() => (last ? finishOnboarding() : setIndex(index + 1))} className="btn-dark w-full">
          {last ? "Începe" : "Continuă"}
        </button>
      </div>
    </div>
  );
}
