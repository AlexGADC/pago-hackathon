import type { RenewalOption } from "@/data/catalog";
import { DEMO_TODAY, daysUntil } from "@/lib/disputes";
import { addDays, addMonths, daysLabel } from "@/lib/format";
import type { ExpiryItem } from "@/types/pago";

export interface ExpiryStatus {
  label: string;
  tone: "red" | "orange" | "green";
  urgent: boolean;
  days: number;
}

export function expiryStatus(item: ExpiryItem, today: string = DEMO_TODAY): ExpiryStatus {
  const days = daysUntil(item.expiresOn, today);
  if (days < 0) return { label: `Expirat de ${daysLabel(days)}`, tone: "red", urgent: true, days };
  if (days === 0) return { label: "Expiră azi", tone: "red", urgent: true, days };
  if (days <= 14) return { label: `Expiră în ${daysLabel(days)}`, tone: "red", urgent: true, days };
  if (days <= 30) return { label: `Expiră în ${daysLabel(days)}`, tone: "orange", urgent: true, days };
  return { label: "Valabil", tone: "green", urgent: false, days };
}

export function renewedExpiry(item: ExpiryItem, option: RenewalOption, today: string = DEMO_TODAY): string {
  const base = item.expiresOn < today ? today : item.expiresOn;
  return option.days ? addDays(base, option.days) : addMonths(base, option.months);
}

export function isVehicleKind(kind: ExpiryItem["kind"]): boolean {
  return kind !== "PAD";
}
