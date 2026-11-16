"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, House, ReceiptText, ShieldCheck } from "lucide-react";

const TABS = [
  { href: "/", label: "Acasă", Icon: House },
  { href: "/facturi", label: "Facturi", Icon: ReceiptText },
  { href: "/abonamente", label: "Abonamente", Icon: CreditCard },
  { href: "/asigurari", label: "Asigurări", Icon: ShieldCheck },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-4 border-t border-line bg-surface pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
      {TABS.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 text-[11px] font-semibold ${active ? "text-pago-blue" : "text-muted"}`}>
            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
