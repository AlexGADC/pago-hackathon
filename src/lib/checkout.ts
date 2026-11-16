import { DEMO_TODAY } from "@/lib/disputes";
import { addDays, dateParts, fmtDay, hashOf, pad2 } from "@/lib/format";
import type { CheckoutItem, PaymentMethod, PaymentRecord } from "@/types/pago";

export const POINTS_PER_RON = 100;
export const MAX_DISCOUNT_SHARE = 0.2;
export const EXTERNAL_METHOD_ID = "external";
export const EXTERNAL_METHOD_LABEL = "În afara aplicației";
export const DUPLICATE_WINDOW_DAYS = 30;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function maxDiscount(points: number, subtotal: number): number {
  return Math.max(0, Math.min(Math.floor(points / POINTS_PER_RON), Math.floor(subtotal * MAX_DISCOUNT_SHARE)));
}

export function pointsEarned(amount: number): number {
  return amount <= 0 ? 0 : Math.max(1, Math.round(amount / 10));
}

export function pointsValue(points: number): number {
  return Math.floor(points / POINTS_PER_RON);
}

export function payeeLabel(title: string): string {
  const plain = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  return `PAGO*${plain.slice(0, 18).trim()}`;
}

export function makeReference(id: string): string {
  return `PG-${String(hashOf(id) % 1_000_000).padStart(6, "0")}`;
}

export function isCardExpired(method: PaymentMethod, today: string = DEMO_TODAY): boolean {
  const [year, month] = dateParts(today);
  return method.expYear < year || (method.expYear === year && method.expMonth < month);
}

export function cardBrandLabel(method: PaymentMethod): string {
  return method.brand === "visa" ? "Visa" : "Mastercard";
}

export function cardLabel(method: PaymentMethod): string {
  return `${cardBrandLabel(method)} •••• ${method.last4}`;
}

export function cardExpiryLabel(method: PaymentMethod): string {
  return `${pad2(method.expMonth)}/${String(method.expYear).slice(2)}`;
}

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  pointsUsed: number;
  fee: number;
  total: number;
}

export function checkoutTotals(items: CheckoutItem[], points: number, usePoints: boolean): CheckoutTotals {
  const subtotal = round2(items.reduce((sum, item) => sum + item.amount, 0));
  const discount = usePoints ? maxDiscount(points, subtotal) : 0;
  return { subtotal, discount, pointsUsed: discount * POINTS_PER_RON, fee: 0, total: round2(subtotal - discount) };
}

export interface DuplicatePayment {
  item: CheckoutItem;
  record: PaymentRecord;
}

function isSamePeriod(record: PaymentRecord, item: CheckoutItem): boolean {
  return record.eventId === item.eventId;
}

function isLookalike(record: PaymentRecord, item: CheckoutItem, since: string): boolean {
  if (record.targetId && item.targetId) return false;
  return record.title === item.title && round2(record.amount + record.discount) === round2(item.amount) && record.createdAt.slice(0, 10) >= since;
}

export function findDuplicates(items: CheckoutItem[], payments: PaymentRecord[], today: string = DEMO_TODAY): DuplicatePayment[] {
  const since = addDays(today.slice(0, 10), -DUPLICATE_WINDOW_DAYS);
  const found: DuplicatePayment[] = [];
  for (const item of items) {
    const matches = payments
      .filter((p) => p.status !== "esuata" && p.houseId === item.houseId)
      .filter((p) => isSamePeriod(p, item) || isLookalike(p, item, since))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (matches.length > 0) found.push({ item, record: matches[0] });
  }
  return found;
}

export function duplicateMessage(duplicate: DuplicatePayment): string {
  const day = fmtDay(duplicate.record.createdAt);
  return duplicate.record.status === "confirmata"
    ? `Ai plătit deja ${duplicate.item.title} pe ${day}.`
    : `Ai deja o plată în curs pentru ${duplicate.item.title}, începută pe ${day}.`;
}
