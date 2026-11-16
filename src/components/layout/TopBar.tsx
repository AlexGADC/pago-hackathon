"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, ChevronRight, Plus, X } from "lucide-react";
import { AvatarImage } from "@/components/shared/Badges";
import { useFamily } from "@/context/FamilyContext";
import { AVATAR_CHOICES } from "@/data/mockFamilyData";

export function TopBar() {
  const { house, houses, activeHouse, unreadCount, setActiveHouse, addHouse, toast } = useFamily();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[2]);

  function close() {
    setOpen(false);
    setAdding(false);
  }

  function choose(id: string) {
    setActiveHouse(id);
    close();
  }

  function create() {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    addHouse({ name: trimmed, emoji: "🏡", address: address.trim() || "Adresă necompletată", avatar });
    toast(`Profilul „${trimmed}” a fost creat`);
    setName("");
    setAddress("");
    close();
  }

  return (
    <header className="relative z-20 bg-gradient-to-b from-pago-blue to-pago-blue-dark px-4 pb-4 pt-3 text-white">
      <div className="flex items-center justify-between">
        <button
          onClick={() => (open ? close() : setOpen(true))}
          aria-label={`Schimbă profilul. Profil activ: ${house.name}`}
          aria-expanded={open}
          className="grid size-10 place-items-center overflow-hidden rounded-full ring-2 ring-white/60"
        >
          <AvatarImage src={house.avatar} size={40} />
        </button>
        <Link href="/" className="text-[17px] font-extrabold lowercase tracking-tight text-white">
          pago
        </Link>
        <Link
          href="/notificari"
          aria-label={unreadCount > 0 ? `Notificări, ${unreadCount} necitite` : "Notificări"}
          className="relative grid size-10 place-items-center rounded-full bg-white/15"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-alert px-1 text-[10px] font-bold text-white ring-2 ring-pago-blue">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} aria-hidden />
          <div className="absolute left-3 right-3 top-full z-20 mt-2 max-h-[70dvh] overflow-y-auto rounded-[28px] border border-white/20 bg-black/70 p-4 text-white shadow-float backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-white">Cine folosește aplicația?</p>
              <button onClick={close} aria-label="Închide" className="grid size-9 place-items-center rounded-full bg-white/20">
                <X size={16} />
              </button>
            </div>
            <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-1">
              {houses.map((h) => (
                <button
                  key={h.id}
                  onClick={() => choose(h.id)}
                  aria-pressed={activeHouse === h.id}
                  className={`flex w-28 shrink-0 snap-start flex-col items-center gap-2 rounded-2xl p-3 text-center transition ${
                    activeHouse === h.id ? "bg-surface text-ink shadow-card" : "bg-white/10 text-white"
                  }`}
                >
                  <span className="size-16 overflow-hidden rounded-full">
                    <AvatarImage src={h.avatar} size={64} />
                  </span>
                  <span className="text-xs font-bold leading-tight">{h.name}</span>
                </button>
              ))}
              <button
                onClick={() => setAdding((v) => !v)}
                aria-expanded={adding}
                className="flex w-28 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/60 p-3 text-white"
              >
                <span className="grid size-16 place-items-center rounded-full bg-white/15">
                  <Plus size={24} />
                </span>
                <span className="text-xs font-bold leading-tight">Adaugă profil</span>
              </button>
            </div>

            {adding && (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-white/10 p-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-white">Numele profilului</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Casa de vacanță" className="field-input" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-white">Adresă (opțional)</span>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Stradă, număr, oraș" className="field-input" />
                </label>
                <div>
                  <span className="mb-1.5 block text-xs font-bold text-white">Alege o imagine</span>
                  <div className="flex gap-2">
                    {AVATAR_CHOICES.map((src) => (
                      <button
                        key={src}
                        onClick={() => setAvatar(src)}
                        aria-label="Alege imaginea"
                        aria-pressed={avatar === src}
                        className={`size-11 overflow-hidden rounded-full ${avatar === src ? "ring-2 ring-white" : "opacity-70"}`}
                      >
                        <AvatarImage src={src} size={44} />
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={create} disabled={name.trim().length < 2} className="btn-blue w-full text-sm disabled:opacity-50">
                  Creează profilul
                </button>
              </div>
            )}

            <Link href="/profil" onClick={close} className="mt-4 flex min-h-11 items-center justify-between rounded-2xl bg-white/10 px-4 text-sm font-bold text-white">
              Contul meu și setări
              <ChevronRight size={18} />
            </Link>
          </div>
        </>
      )}
    </header>
  );
}
