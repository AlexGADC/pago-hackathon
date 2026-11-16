// Logică pură, fără React — folosită și de UI, și de API.

import type { Bill, IndexValidation } from "@/types/pago";

/** Flux A: indexul real trebuie să fie între ultimul index confirmat și indexul contestat. */
export function validateIndex(bill: Bill, realIndex: number): IndexValidation {
  const m = bill.meter;
  if (!m) return { ok: false, error: "Factura nu are contor." };
  if (!Number.isFinite(realIndex)) return { ok: false, error: "Introdu un număr valid." };
  if (realIndex < m.lastConfirmedIndex)
    return { ok: false, error: `Indexul nu poate fi mai mic decât ultimul index confirmat (${fmtNum(m.lastConfirmedIndex)} ${m.unit}).` };
  if (realIndex > m.billedIndex)
    return { ok: false, error: `Indexul nu poate fi mai mare decât cel facturat (${fmtNum(m.billedIndex)} ${m.unit}).` };

  const consumption = realIndex - m.lastConfirmedIndex;
  const correctAmount = Math.round(consumption * m.pricePerUnit);
  return { ok: true, consumption, correctAmount, disputedAmount: bill.amount - correctAmount };
}

export function legalDeadlineDays(bill: Bill): 15 | 30 {
  return bill.kind === "telecom" || bill.kind === "salubritate" ? 30 : 15;
}

export function percentOverAverage(bill: Bill): number {
  return Math.round(((bill.amount - bill.averageAmount) / bill.averageAmount) * 100);
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("ro-RO").format(n);
}

export function fmtRon(n: number): string {
  return `${fmtNum(n)} RON`;
}

/** Data „de azi” fixă pentru demo: zilele rămase arată la fel la fiecare prezentare (și permite prerender). */
export const DEMO_TODAY = "2026-11-16";

export function daysUntil(iso: string, from: string = DEMO_TODAY): number {
  const ms = new Date(iso).getTime() - new Date(from).getTime();
  return Math.ceil(ms / 86_400_000);
}
