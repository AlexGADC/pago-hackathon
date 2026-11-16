import { CYCLE_LABEL } from "@/data/catalog";
import { monthlyCost } from "@/lib/subscriptions";
import type { AutopayRule, Bill, ExpiryItem, PaymentCategory, Subscription, TargetKind } from "@/types/pago";

export interface TargetSource {
  bills: Bill[];
  subscriptions: Subscription[];
  expiries: ExpiryItem[];
}

export interface TargetInfo {
  id: string;
  kind: TargetKind;
  name: string;
  amount: number;
  monthly: number;
  rhythm: string;
  href: string;
  category: PaymentCategory;
}

export function resolveTarget(source: TargetSource, targetId: string): TargetInfo | null {
  const bill = source.bills.find((b) => b.id === targetId);
  if (bill) {
    return { id: bill.id, kind: "bill", name: bill.provider, amount: bill.averageAmount, monthly: bill.averageAmount, rhythm: "lunar", href: `/facturi/${bill.id}`, category: "utilitati" };
  }
  const sub = source.subscriptions.find((s) => s.id === targetId);
  if (sub) {
    return { id: sub.id, kind: "subscription", name: sub.name, amount: sub.price, monthly: monthlyCost(sub), rhythm: CYCLE_LABEL[sub.cycle], href: `/abonamente/${sub.id}`, category: "abonamente" };
  }
  const item = source.expiries.find((e) => e.id === targetId);
  if (item) {
    return { id: item.id, kind: "expiry", name: `${item.kind} · ${item.subject}`, amount: item.price, monthly: item.price / 12, rhythm: "anual", href: `/asigurari/${item.id}`, category: "asigurari" };
  }
  return null;
}

export function ruleFor(rules: AutopayRule[], targetId: string): AutopayRule | undefined {
  return rules.find((r) => r.targetId === targetId);
}

export function activeRule(rules: AutopayRule[], targetId: string): AutopayRule | undefined {
  return rules.find((r) => r.targetId === targetId && r.enabled);
}

export function suggestedLimit(amount: number): number {
  return Math.max(10, Math.ceil((amount * 1.25) / 10) * 10);
}

export function autopayMonthlyTotal(rules: AutopayRule[], source: TargetSource): number {
  return rules
    .filter((r) => r.enabled)
    .reduce((sum, rule) => sum + (resolveTarget(source, rule.targetId)?.monthly ?? 0), 0);
}
