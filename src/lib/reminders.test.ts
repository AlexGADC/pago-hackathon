import { describe, expect, it } from "vitest";
import type { PaymentEvent } from "@/lib/payments";
import { dueReminders, reminderLabel, thresholdFor } from "@/lib/reminders";

const event = (id: string, date: string, paid = false): PaymentEvent => ({ id, date, title: id, amount: 10, category: "utilitati", paid });

describe("thresholdFor", () => {
  it("maps days left to the reminder thresholds", () => {
    expect(thresholdFor(7)).toBe(7);
    expect(thresholdFor(4)).toBe(7);
    expect(thresholdFor(3)).toBe(3);
    expect(thresholdFor(1)).toBe(3);
    expect(thresholdFor(0)).toBe(0);
    expect(thresholdFor(-2)).toBe(0);
  });
});

describe("dueReminders", () => {
  const events = [
    event("azi", "2026-11-16"),
    event("in-5-zile", "2026-11-21"),
    event("in-20-zile", "2026-12-06"),
    event("platit", "2026-11-18", true),
    event("intarziat", "2026-11-14"),
  ];
  const reminders = dueReminders(events);

  it("keeps unpaid payments within seven days and overdue ones", () => {
    expect(reminders.map((r) => r.event.id)).toEqual(["intarziat", "azi", "in-5-zile"]);
  });

  it("drops paid payments and payments further than seven days away", () => {
    expect(reminders.find((r) => r.event.id === "platit")).toBeUndefined();
    expect(reminders.find((r) => r.event.id === "in-20-zile")).toBeUndefined();
  });

  it("marks overdue payments", () => {
    expect(reminders[0].overdue).toBe(true);
    expect(reminders[1].overdue).toBe(false);
  });
});

describe("reminderLabel", () => {
  it("describes the time left in Romanian", () => {
    expect(reminderLabel(0)).toBe("Azi");
    expect(reminderLabel(1)).toBe("Mâine");
    expect(reminderLabel(4)).toBe("În 4 zile");
    expect(reminderLabel(-1)).toBe("Întârziat cu 1 zi");
    expect(reminderLabel(-2)).toBe("Întârziat cu 2 zile");
  });
});
