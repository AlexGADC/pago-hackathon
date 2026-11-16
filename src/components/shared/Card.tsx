import type { ReactNode } from "react";

export type TagTone = "blue" | "red" | "green" | "orange" | "indigo" | "gray";

const TAG_CLASS: Record<TagTone, string> = {
  blue: "tag-blue",
  red: "tag-red",
  green: "tag-green",
  orange: "tag-orange",
  indigo: "tag-indigo",
  gray: "tag-gray",
};

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-card bg-surface p-5 shadow-card ${className}`}>{children}</section>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function Tag({ children, tone }: { children: ReactNode; tone: TagTone }) {
  return <span className={`${TAG_CLASS[tone]} inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold`}>{children}</span>;
}
