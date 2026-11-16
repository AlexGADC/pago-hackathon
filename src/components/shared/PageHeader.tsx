import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function PageHeader({ title, subtitle, back = "/", action }: { title: string; subtitle?: string; back?: string; action?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 pt-2">
      <Link href={back} aria-label="Înapoi" className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card">
        <ArrowLeft size={20} />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function ScreenTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 pt-2">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
