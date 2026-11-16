import { describe, expect, it } from "vitest";
import type { PaymentEvent } from "@/lib/payments";
import { dueReminders, reminderLabel, thresholdFor, thresholdLabel } from "@/lib/reminders";

function event(id: string, date: string, patch: Partial<PaymentEvent> = {}): PaymentEvent {
  return {
    id,
    date,
    title: id,
    amount: 10,
    category: "utilitati",
    paid: false,
    targetId: id,
    targetKind: "bill",
    houseId: "acasa",
    href: `/facturi/${id}`,
    estimated: false,
    flagged: false,
    frozen: 0,
    autopay: "none",
    ...patch,
  };
}

describe("thresholdFor", () => {
  it("maps days left to the default reminder thresholds", () => {
    expect(thresholdFor(7)).toBe(7);
    expect(thresholdFor(4)).toBe(7);
    expect(thresholdFor(3)).toBe(3);
    expect(thresholdFor(1)).toBe(3);
    expect(thresholdFor(0)).toBe(0);
    expect(thresholdFor(-2)).toBe(0);
  });

  it("respects custom thresholds", () => {
    expect(thresholdFor(10, [14, 1])).toBe(14);
    expect(thresholdFor(1, [14, 1])).toBe(1);
  });
});

describe("dueReminders", () => {
  const events = [
    event("azi", "2026-11-16"),
    event("in-5-zile", "2026-11-21"),
    event("in-20-zile", "2026-12-06"),
    event("platit", "2026-11-18", { paid: true }),
    event("intarziat", "2026-11-14"),
    event("estimat", "2026-11-17", { estimated: true }),
  ];
  const reminders = dueReminders(events);

  it("keeps unpaid payments within seven days and overdue ones", () => {
    expect(reminders.map((r) => r.event.id)).toEqual(["intarziat", "azi", "in-5-zile"]);
  });

  it("drops paid, estimated and far-away payments", () => {
    const ids = reminders.map((r) => r.event.id);
    expect(ids).not.toContain("platit");
    expect(ids).not.toContain("estimat");
    expect(ids).not.toContain("in-20-zile");
  });

  it("marks overdue payments", () => {
    expect(reminders[0].overdue).toBe(true);
    expect(reminders[1].overdue).toBe(false);
  });

  it("widens the window when the user asks for earlier reminders", () => {
    const wide = dueReminders(events, "2026-11-16", [14, 3]);
    expect(wide.map((r) => r.event.id)).not.toContain("in-20-zile");
    expect(dueReminders(events, "2026-11-16", [21]).map((r) => r.event.id)).toContain("in-20-zile");
  });

  it("labels the kind of action each reminder needs", () => {
    const kinds = dueReminders([
      event("manual", "2026-11-17"),
      event("auto", "2026-11-18", { autopay: "scheduled", autopayLimit: 100 }),
      event("peste-limita", "2026-11-19", { autopay: "blocked", autopayLimit: 5 }),
      event("suspect", "2026-11-20", { flagged: true }),
      event("rca", "2026-11-21", { targetKind: "expiry" }),
    ]).map((r) => r.kind);
    expect(kinds).toEqual(["manual", "auto", "blocked", "flagged", "renew"]);
  });
});

describe("labels", () => {
  it("describes the time left in Romanian", () => {
    expect(reminderLabel(0)).toBe("Azi");
    expect(reminderLabel(1)).toBe("Mâine");
    expect(reminderLabel(4)).toBe("În 4 zile");
    expect(reminderLabel(21)).toBe("În 21 de zile");
    expect(reminderLabel(-1)).toBe("Întârziat cu 1 zi");
    expect(reminderLabel(-2)).toBe("Întârziat cu 2 zile");
  });

  it("describes reminder thresholds", () => {
    expect(thresholdLabel(0)).toBe("În ziua scadenței");
    expect(thresholdLabel(1)).toBe("Cu o zi înainte");
    expect(thresholdLabel(7)).toBe("Cu 7 zile înainte");
  });
});
