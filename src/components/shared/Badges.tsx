import Image from "next/image";
import { Car, Home, Receipt, Repeat, Sparkles, type LucideIcon } from "lucide-react";
import { hashOf, initials } from "@/lib/format";
import { CATEGORY_META, eventState, type PaymentEvent } from "@/lib/payments";
import type { PaymentCategory } from "@/types/pago";

export const CATEGORY_ICON: Record<PaymentCategory, LucideIcon> = {
  utilitati: Receipt,
  abonamente: Repeat,
  asigurari: Car,
  servicii: Sparkles,
};

const BRAND_TONES = [
  "bg-cat-blue/15 text-cat-blue",
  "bg-cat-red/15 text-cat-red",
  "bg-cat-green/15 text-cat-green",
  "bg-cat-amber/15 text-cat-amber",
  "bg-family-indigo/15 text-family-indigo",
  "bg-family-coral/15 text-family-coral",
];

export function BrandBadge({ name, large = false }: { name: string; large?: boolean }) {
  const tone = BRAND_TONES[hashOf(name) % BRAND_TONES.length];
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-2xl font-extrabold ${tone} ${large ? "size-14 text-lg" : "size-11 text-sm"}`}>
      {initials(name)}
    </span>
  );
}

export type BadgeSize = "sm" | "md" | "lg";

const BADGE_BOX: Record<BadgeSize, string> = { sm: "size-5 rounded", md: "size-6 rounded-md", lg: "size-10 rounded-xl" };
const BADGE_ICON: Record<BadgeSize, number> = { sm: 10, md: 12, lg: 18 };

export function CategoryBadge({ category, filled = false, size = "md", dashed = false }: { category: PaymentCategory; filled?: boolean; size?: BadgeSize; dashed?: boolean }) {
  const meta = CATEGORY_META[category];
  const Icon = CATEGORY_ICON[category];
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center ${BADGE_BOX[size]} ${
        filled ? `${meta.dot} text-white` : `bg-surface ${meta.text} border-2 border-current ${dashed ? "border-dashed" : ""}`
      }`}
    >
      <Icon size={BADGE_ICON[size]} strokeWidth={2.4} />
    </span>
  );
}

export function EventBadge({ event, size = "md" }: { event: PaymentEvent; size?: BadgeSize }) {
  return <CategoryBadge category={event.category} filled={event.paid} size={size} dashed={eventState(event) === "estimated"} />;
}

export function AvatarImage({ src, size }: { src: string; size: number }) {
  return <Image src={src} alt="" width={size} height={size} unoptimized className="size-full object-cover" />;
}

export function SubjectIcon({ kind }: { kind: "car" | "home" }) {
  const Icon = kind === "car" ? Car : Home;
  return (
    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-2xl bg-cat-green/15 text-cat-green">
      <Icon size={18} />
    </span>
  );
}
