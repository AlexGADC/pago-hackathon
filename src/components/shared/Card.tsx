import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-card bg-white p-5 shadow-card ${className}`}>{children}</section>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wide text-muted">{children}</h2>;
}

/** Pastilă mică pastel deasupra titlurilor (CLAUDE.md §5). */
export function Tag({ children, tone }: { children: ReactNode; tone: "blue" | "red" | "green" | "orange" | "indigo" }) {
  const cls = { blue: "tag-blue", red: "tag-red", green: "tag-green", orange: "tag-orange", indigo: "tag-indigo" }[tone];
  return <span className={`${cls} inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold`}>{children}</span>;
}
