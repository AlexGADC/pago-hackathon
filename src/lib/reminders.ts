import { DEMO_TODAY, daysUntil } from "@/lib/disputes";
import type { PaymentEvent } from "@/lib/payments";

export const REMINDER_THRESHOLDS = [7, 3, 0] as const;

export interface Reminder {
  event: PaymentEvent;
  daysLeft: number;
  threshold: 7 | 3 | 0;
  overdue: boolean;
}

export function thresholdFor(daysLeft: number): 7 | 3 | 0 {
  if (daysLeft <= 0) return 0;
  if (daysLeft <= 3) return 3;
  return 7;
}

export function dueReminders(events: PaymentEvent[], today: string = DEMO_TODAY): Reminder[] {
  return events
    .filter((e) => !e.paid)
    .map((event) => {
      const daysLeft = daysUntil(event.date, today);
      return { event, daysLeft, threshold: thresholdFor(daysLeft), overdue: daysLeft < 0 };
    })
    .filter((r) => r.overdue || r.daysLeft <= REMINDER_THRESHOLDS[0])
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function reminderLabel(daysLeft: number): string {
  if (daysLeft < 0) return `Întârziat cu ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? "zi" : "zile"}`;
  if (daysLeft === 0) return "Azi";
  if (daysLeft === 1) return "Mâine";
  return `În ${daysLeft} zile`;
}
