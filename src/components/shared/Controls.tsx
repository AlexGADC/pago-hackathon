"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-pago-blue" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 size-6 rounded-full bg-surface shadow-card transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex rounded-full bg-surface-2 p-1 text-xs font-bold">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-9 flex-1 rounded-full px-3 transition ${value === option.value ? "bg-surface text-ink shadow-card" : "text-muted"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`pill shrink-0 ${active ? "pill-primary" : "pill-soft"}`}>
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs font-semibold text-alert">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function MenuRow({ href, icon: Icon, title, subtitle, right }: { href: string; icon: LucideIcon; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 py-2.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-2 text-pago-blue">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
      </span>
      {right}
      <ChevronRight size={18} className="shrink-0 text-muted" />
    </Link>
  );
}

export function EmptyState({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-card bg-surface px-6 py-8 text-center shadow-card">
      <span className="grid size-14 place-items-center rounded-full bg-surface-2 text-pago-blue">
        <Icon size={26} />
      </span>
      <p className="mt-3 text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
      {children && <div className="mt-4 flex w-full flex-col gap-2">{children}</div>}
    </div>
  );
}

export function InfoNote({ icon: Icon, children, tone = "info" }: { icon: LucideIcon; children: ReactNode; tone?: "info" | "alert" | "warning" | "success" }) {
  const toneClass = {
    info: "bg-surface-2 text-muted",
    alert: "bg-alert-bg text-alert",
    warning: "bg-warning-bg text-warning",
    success: "bg-success-bg text-success",
  }[tone];
  return (
    <p className={`flex items-start gap-2 rounded-2xl p-3 text-xs leading-relaxed ${toneClass}`}>
      <Icon size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
