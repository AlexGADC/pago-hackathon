import { DEMO_TODAY, daysUntil } from "@/lib/disputes";
import { daysLabel } from "@/lib/format";
import { eventState, type PaymentEvent } from "@/lib/payments";

export const DEFAULT_THRESHOLDS = [7, 3, 0];
export const THRESHOLD_CHOICES = [14, 7, 3, 1, 0];

export type ReminderKind = "manual" | "auto" | "blocked" | "flagged" | "renew" | "failed";

export interface Reminder {
  event: PaymentEvent;
  daysLeft: number;
  threshold: number;
  overdue: boolean;
  kind: ReminderKind;
}

export function reminderWindow(thresholds: number[] = DEFAULT_THRESHOLDS): number {
  return thresholds.length ? Math.max(...thresholds) : 0;
}

export function thresholdFor(daysLeft: number, thresholds: number[] = DEFAULT_THRESHOLDS): number {
  const sorted = [...thresholds].sort((a, b) => a - b);
  const left = Math.max(daysLeft, 0);
  return sorted.find((t) => t >= left) ?? sorted[sorted.length - 1] ?? 0;
}

function kindOf(event: PaymentEvent): ReminderKind | null {
  const state = eventState(event);
  if (state === "paid" || state === "pending" || state === "estimated") return null;
  if (state === "flagged") return "flagged";
  if (state === "auto") return "auto";
  if (state === "blocked") return "blocked";
  if (state === "renew") return "renew";
  if (state === "failed") return "failed";
  return "manual";
}

export function dueReminders(events: PaymentEvent[], today: string = DEMO_TODAY, thresholds: number[] = DEFAULT_THRESHOLDS): Reminder[] {
  const window = reminderWindow(thresholds);
  const reminders: Reminder[] = [];
  for (const event of events) {
    const kind = kindOf(event);
    if (!kind) continue;
    const daysLeft = daysUntil(event.date, today);
    const overdue = daysLeft < 0;
    if (!overdue && daysLeft > window) continue;
    reminders.push({ event, daysLeft, threshold: thresholdFor(daysLeft, thresholds), overdue, kind });
  }
  return reminders.sort((a, b) => a.daysLeft - b.daysLeft || a.event.title.localeCompare(b.event.title));
}

export function reminderLabel(daysLeft: number): string {
  if (daysLeft < 0) return `Întârziat cu ${daysLabel(daysLeft)}`;
  if (daysLeft === 0) return "Azi";
  if (daysLeft === 1) return "Mâine";
  return `În ${daysLabel(daysLeft)}`;
}

export function thresholdLabel(days: number): string {
  if (days === 0) return "În ziua scadenței";
  if (days === 1) return "Cu o zi înainte";
  return `Cu ${daysLabel(days)} înainte`;
}
