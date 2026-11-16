"use client";

import { RotateCcw } from "lucide-react";
import { houses } from "@/data/mockFamilyData";
import { useFamily } from "@/context/FamilyContext";

/** Status bar simulat + switcher-ul Casa Noastră / Casa Bunicilor + Reset Demo discret. */
export function TopBar() {
  const { activeHouse, setActiveHouse, resetDemo } = useFamily();

  return (
    <header className="bg-white px-4 pb-3 pt-2 shadow-[0_1px_0_#E2E8F0]">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>9:41</span>
        <span className="text-[15px] font-extrabold lowercase tracking-tight text-pago-blue">pago</span>
        <button onClick={resetDemo} title="Reset Demo" className="flex items-center gap-1 rounded-full px-2 py-0.5 text-slate-400 hover:bg-slate-100">
          <RotateCcw size={12} /> reset
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
        {houses.map((h) => (
          <button
            key={h.id}
            onClick={() => setActiveHouse(h.id)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              activeHouse === h.id ? "bg-white text-pago-blue shadow-sm" : "text-slate-500"
            }`}
          >
            {h.emoji} {h.name}
          </button>
        ))}
      </div>
    </header>
  );
}
