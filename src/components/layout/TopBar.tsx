"use client";

import { useState } from "react";
import { Plus, RotateCcw, X } from "lucide-react";
import { houses } from "@/data/mockFamilyData";
import { useFamily } from "@/context/FamilyContext";

export function TopBar() {
  const { house, activeHouse, setActiveHouse, resetDemo } = useFamily();
  const [open, setOpen] = useState(false);

  function choose(id: (typeof houses)[number]["id"]) {
    setActiveHouse(id);
    setOpen(false);
  }

  return (
    <header className="relative bg-gradient-to-b from-pago-blue to-pago-blue-dark px-4 pb-4 pt-3 text-white">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Schimbă profilul"
          aria-expanded={open}
          className="grid size-10 place-items-center overflow-hidden rounded-full ring-2 ring-white/60"
        >
          <img src={house.avatar} alt={house.name} className="size-full object-cover" />
        </button>
        <span className="text-[17px] font-extrabold lowercase tracking-tight text-white">pago</span>
        <button onClick={resetDemo} title="Reset Demo" className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white/80 hover:bg-surface/10">
          <RotateCcw size={12} /> reset
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-3 right-3 top-full z-20 mt-2 rounded-[28px] border border-white/20 bg-black/70 p-4 text-white shadow-float backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-white">Cine folosește aplicația?</p>
              <button onClick={() => setOpen(false)} aria-label="Închide" className="grid size-8 place-items-center rounded-full bg-surface/20">
                <X size={16} />
              </button>
            </div>
            <div className="flex snap-x gap-3 overflow-x-auto pb-1">
              {houses.map((h) => (
                <button
                  key={h.id}
                  onClick={() => choose(h.id)}
                  className={`flex w-28 shrink-0 snap-start flex-col items-center gap-2 rounded-2xl p-3 text-center transition ${
                    activeHouse === h.id ? "bg-surface text-ink shadow-card" : "bg-surface/10 text-white"
                  }`}
                >
                  <span className="size-16 overflow-hidden rounded-full">
                    <img src={h.avatar} alt="" className="size-full object-cover" />
                  </span>
                  <span className="text-xs font-bold leading-tight">{h.name}</span>
                </button>
              ))}
              <button className="flex w-28 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/60 p-3 text-white">
                <span className="grid size-16 place-items-center rounded-full bg-surface/15">
                  <Plus size={24} />
                </span>
                <span className="text-xs font-bold leading-tight">Adaugă profil</span>
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
