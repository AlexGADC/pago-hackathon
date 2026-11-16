"use client";

import { RotateCcw } from "lucide-react";
import { houses } from "@/data/mockFamilyData";
import { useFamily } from "@/context/FamilyContext";

export function TopBar() {
  const { activeHouse, setActiveHouse, resetDemo } = useFamily();

  return (
    <header className="bg-gradient-to-b from-pago-blue to-pago-blue-dark px-4 pb-4 pt-3 text-white">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-white/85">
        <span>9:41</span>
        <span className="text-[17px] font-extrabold lowercase tracking-tight text-white">pago</span>
        <button onClick={resetDemo} title="Reset Demo" className="flex items-center gap-1 rounded-full px-2 py-0.5 text-white/80 hover:bg-white/10">
          <RotateCcw size={12} /> reset
        </button>
      </div>
      <div className="glass grid grid-cols-2 gap-1 rounded-full p-1">
        {houses.map((h) => (
          <button
            key={h.id}
            onClick={() => setActiveHouse(h.id)}
            className={`rounded-full px-3 py-2 text-sm font-semibold transition ${activeHouse === h.id ? "bg-white text-pago-blue shadow-card" : "text-white/90"}`}
          >
            {h.emoji} {h.name}
          </button>
        ))}
      </div>
    </header>
  );
}
