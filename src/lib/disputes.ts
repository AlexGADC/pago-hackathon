import type { Bill, IndexValidation } from "@/types/pago";

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

export function hasWorkingDayDeadline(bill: Bill): boolean {
  return bill.kind === "curent" || bill.kind === "gaz";
}

export function legalDeadlineLabel(bill: Bill): string {
  if (hasWorkingDayDeadline(bill)) return "15 zile lucrătoare";
  return legalDeadlineDays(bill) === 30 ? "30 de zile" : "15 zile";
}

export const DISPUTE_REQUEST = "Am achitat suma necontestată și solicit suspendarea plății diferenței până la soluționarea sesizării.";

export function disputeRequest(paidAmount: number, disputedAmount: number): string {
  if (paidAmount <= 0) {
    return `Contest întreaga sumă de ${fmtRon(disputedAmount)} și solicit suspendarea plății până la soluționarea sesizării, precum și emiterea facturii storno.`;
  }
  return `${DISPUTE_REQUEST} Suma achitată: ${fmtRon(paidAmount)}. Diferența contestată: ${fmtRon(disputedAmount)}, pentru care solicit emiterea facturii storno.`;
}

export function percentOverAverage(bill: Bill): number {
  return Math.round(((bill.amount - bill.averageAmount) / bill.averageAmount) * 100);
}

const wholeFormat = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 });
const centsFormat = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fmtNum(n: number): string {
  return wholeFormat.format(n);
}

export function fmtRon(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return `${Number.isInteger(rounded) ? wholeFormat.format(rounded) : centsFormat.format(rounded)} RON`;
}

export const DEMO_TODAY = "2026-11-16";

export function daysUntil(iso: string, from: string = DEMO_TODAY): number {
  const ms = new Date(iso.slice(0, 10)).getTime() - new Date(from.slice(0, 10)).getTime();
  return Math.ceil(ms / 86_400_000);
}
