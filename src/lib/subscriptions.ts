import { DEMO_TODAY, daysUntil } from "@/lib/disputes";
import { dateParts, daysInMonth, toIso } from "@/lib/format";
import type { BillingCycle, Subscription } from "@/types/pago";

export const CYCLE_MONTHS: Record<BillingCycle, number> = { monthly: 1, quarterly: 3, yearly: 12 };

export const UNUSED_AFTER_DAYS = 60;

export function occursInMonth(sub: Subscription, year: number, month: number): boolean {
  const [anchorYear, anchorMonth] = dateParts(sub.renewsOn);
  const interval = CYCLE_MONTHS[sub.cycle];
  const diff = year * 12 + month - (anchorYear * 12 + anchorMonth);
  return ((diff % interval) + interval) % interval === 0;
}

export function occurrenceDate(sub: Subscription, year: number, month: number): string {
  const day = dateParts(sub.renewsOn)[2];
  return toIso(year, month, Math.min(day, daysInMonth(year, month)));
}

export function isChargedOn(sub: Subscription, date: string): boolean {
  if (sub.startedOn && date < sub.startedOn) return false;
  if (sub.status !== "activ") return Boolean(sub.statusChangedOn) && date < (sub.statusChangedOn as string);
  return true;
}

export function priceOn(sub: Subscription, date: string): number {
  if (sub.previousPrice !== undefined && sub.priceChangedOn && date < sub.priceChangedOn) return sub.previousPrice;
  return sub.price;
}

export function nextRenewal(sub: Subscription, today: string = DEMO_TODAY): string | null {
  if (sub.status !== "activ") return null;
  const [year, month] = dateParts(today);
  for (let offset = 0; offset <= 12; offset++) {
    const index = year * 12 + (month - 1) + offset;
    const y = Math.floor(index / 12);
    const m = (index % 12) + 1;
    if (!occursInMonth(sub, y, m)) continue;
    const date = occurrenceDate(sub, y, m);
    if (date >= today && isChargedOn(sub, date)) return date;
  }
  return null;
}

export function monthlyCost(sub: Subscription): number {
  return sub.price / CYCLE_MONTHS[sub.cycle];
}

export function yearlyCost(sub: Subscription): number {
  return (sub.price * 12) / CYCLE_MONTHS[sub.cycle];
}

export function isUnused(sub: Subscription): boolean {
  return sub.status === "activ" && (sub.lastUsedDaysAgo ?? 0) >= UNUSED_AFTER_DAYS;
}

export function priceIncrease(sub: Subscription): { delta: number; yearlyDelta: number } | null {
  if (sub.previousPrice === undefined || sub.previousPrice >= sub.price) return null;
  const delta = sub.price - sub.previousPrice;
  return { delta, yearlyDelta: (delta * 12) / CYCLE_MONTHS[sub.cycle] };
}

export function trialDaysLeft(sub: Subscription, today: string = DEMO_TODAY): number | null {
  if (!sub.trialEndsOn || sub.status !== "activ") return null;
  const days = daysUntil(sub.trialEndsOn, today);
  return days >= 0 ? days : null;
}

export function activeSubscriptions(subs: Subscription[]): Subscription[] {
  return subs.filter((s) => s.status === "activ");
}

export function totalMonthly(subs: Subscription[]): number {
  return activeSubscriptions(subs).reduce((sum, s) => sum + monthlyCost(s), 0);
}

export function totalYearly(subs: Subscription[]): number {
  return activeSubscriptions(subs).reduce((sum, s) => sum + yearlyCost(s), 0);
}

export function potentialSavings(subs: Subscription[]): number {
  return subs.filter(isUnused).reduce((sum, s) => sum + yearlyCost(s), 0);
}
