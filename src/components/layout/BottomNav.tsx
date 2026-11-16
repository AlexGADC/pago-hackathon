"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Radar, ReceiptText, Users } from "lucide-react";

const TABS = [
  { href: "/", label: "Acasă", Icon: House },
  { href: "/facturi", label: "Facturi", Icon: ReceiptText },
  { href: "/familie", label: "Familie", Icon: Users },
  { href: "/radar", label: "Radar", Icon: Radar },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-4 border-t border-card-border bg-white pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
      {TABS.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 text-[11px] font-semibold ${active ? "text-pago-blue" : "text-slate-400"}`}>
            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
