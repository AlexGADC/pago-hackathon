import { describe, expect, it } from "vitest";
import { autopayRules, bills, expiries, subscriptions } from "@/data/mockFamilyData";
import { buildEvents, eventState, eventsInMonth, isOverdue, isPayable, monthDays, splitPaid, summarizeMonth, summarizeYear, upcomingEvent, weekdayIndex, type LedgerData } from "@/lib/payments";
import type { DisputeTicket, PaymentRecord } from "@/types/pago";

const ledger: LedgerData = { bills, subscriptions, expiries, payments: [], tickets: [], autopay: autopayRules };
const events2026 = buildEvents(ledger, "acasa", 2026);

function record(patch: Partial<PaymentRecord>): PaymentRecord {
  return {
    id: "pay-1",
    eventId: "bill-digi-2026-11",
    targetId: "bill-digi",
    targetKind: "bill",
    houseId: "acasa",
    title: "Digi România",
    payee: "PAGO*DIGI ROMANIA",
    category: "utilitati",
    amount: 62,
    fee: 0,
    discount: 0,
    pointsUsed: 0,
    pointsEarned: 0,
    methodId: "pm-visa",
    methodLabel: "Visa •••• 4821",
    status: "confirmata",
    createdAt: "2026-11-16T10:00:00",
    reference: "PG-000001",
    ...patch,
  };
}

describe("buildEvents · subscriptions", () => {
  it("places a monthly subscription once in every month", () => {
    const netflix = events2026.filter((e) => e.title === "Netflix");
    expect(netflix).toHaveLength(12);
    expect(new Set(netflix.map((e) => e.date.slice(0, 7))).size).toBe(12);
  });

  it("places a yearly subscription only once a year", () => {
    const chatgpt = events2026.filter((e) => e.title === "ChatGPT Plus");
    expect(chatgpt).toHaveLength(1);
    expect(chatgpt[0].date).toBe("2026-04-05");
    expect(chatgpt[0].amount).toBe(1200);
  });

  it("places a quarterly subscription every three months", () => {
    const months = events2026.filter((e) => e.title === "Bitdefender").map((e) => e.date.slice(5, 7));
    expect(months).toEqual(["03", "06", "09", "12"]);
  });

  it("uses the old price before a price increase", () => {
    const netflix = events2026.filter((e) => e.title === "Netflix");
    expect(netflix.find((e) => e.date.startsWith("2026-10"))?.amount).toBe(49.99);
    expect(netflix.find((e) => e.date.startsWith("2026-11"))?.amount).toBe(59.99);
  });

  it("stops charging a paused subscription", () => {
    const gym = events2026.filter((e) => e.title === "Sală 18GYM").map((e) => e.date);
    expect(gym).toContain("2026-11-01");
    expect(gym).not.toContain("2026-12-01");
  });

  it("stops charging a cancelled subscription", () => {
    const hbo = events2026.filter((e) => e.title === "HBO Max").map((e) => e.date);
    expect(hbo[hbo.length - 1]).toBe("2026-10-12");
  });

  it("starts charging a trial only when it ends", () => {
    const icloud = events2026.filter((e) => e.title === "iCloud 200 GB").map((e) => e.date);
    expect(icloud).toEqual(["2026-11-19", "2026-12-19"]);
  });
});

describe("buildEvents · bills", () => {
  it("can place two payments on the same day", () => {
    const november25 = eventsInMonth(events2026, 2026, 11).filter((e) => e.date === "2026-11-25");
    expect(november25.map((e) => e.title).sort()).toEqual(["Disney+", "Electrica Furnizare"]);
  });

  it("marks history as paid and future bills as estimates", () => {
    expect(eventsInMonth(events2026, 2026, 10).every((e) => e.paid)).toBe(true);
    const december = eventsInMonth(events2026, 2026, 12).find((e) => e.title === "Electrica Furnizare");
    expect(december).toMatchObject({ estimated: true, paid: false, amount: 260 });
  });

  it("keeps an unpaid bill overdue after its due date", () => {
    const maintenance = events2026.find((e) => e.id === "bill-intretinere-2026-11");
    expect(maintenance?.paid).toBe(false);
    expect(maintenance && isOverdue(maintenance)).toBe(true);
    expect(maintenance && isPayable(maintenance)).toBe(true);
  });

  it("flags suspicious bills instead of offering payment", () => {
    const electrica = events2026.find((e) => e.id === "bill-electrica-2026-11");
    expect(electrica && eventState(electrica)).toBe("flagged");
    expect(electrica && isPayable(electrica)).toBe(false);
  });

  it("shows only the undisputed amount for a disputed bill", () => {
    const ticket: DisputeTicket = {
      id: "t1",
      billId: "bill-electrica",
      houseId: "acasa",
      createdAt: "2026-11-16T10:00:00",
      stage: "trimisa",
      legalDeadlineDays: 15,
      confidence: "Declarat manual de client (supus regularizării)",
      disputedAmount: 1469,
      paidAmount: 11,
      message: "",
    };
    const disputed = buildEvents({ ...ledger, tickets: [ticket], bills: bills.map((b) => (b.id === "bill-electrica" ? { ...b, status: "contestata" as const } : b)) }, "acasa", 2026);
    expect(disputed.find((e) => e.id === "bill-electrica-2026-11")).toMatchObject({ amount: 11, frozen: 1469, flagged: false, paid: false });
  });

  it("sorts events by date", () => {
    const dates = events2026.map((e) => e.date);
    expect([...dates].sort()).toEqual(dates);
  });
});

describe("buildEvents · payments and autopay", () => {
  it("marks an event paid once its payment is confirmed", () => {
    const paid = buildEvents({ ...ledger, payments: [record({})] }, "acasa", 2026);
    expect(paid.find((e) => e.id === "bill-digi-2026-11")?.paid).toBe(true);
  });

  it("keeps an event unpaid while its payment is in flight or failed", () => {
    const pending = buildEvents({ ...ledger, payments: [record({ status: "trimisa" })] }, "acasa", 2026).find((e) => e.id === "bill-digi-2026-11");
    expect(pending && eventState(pending)).toBe("pending");
    const failed = buildEvents({ ...ledger, payments: [record({ status: "esuata", eventId: "bill-gaz-2026-11", targetId: "bill-gaz" })] }, "acasa", 2026).find((e) => e.id === "bill-gaz-2026-11");
    expect(failed && eventState(failed)).toBe("failed");
  });

  it("adds one-off payments as extra events on the payment day", () => {
    const extra = record({ eventId: "svc-topup-1", targetId: undefined, targetKind: "extra", title: "Reîncărcare Orange", category: "servicii", amount: 35 });
    const withExtra = buildEvents({ ...ledger, payments: [extra] }, "acasa", 2026);
    expect(withExtra.find((e) => e.id === "svc-topup-1")).toMatchObject({ date: "2026-11-16", paid: true, category: "servicii", targetKind: "extra" });
  });

  it("schedules autopay within the safety limit and blocks it above", () => {
    const digi = events2026.find((e) => e.id === "bill-digi-2026-11");
    expect(digi && eventState(digi)).toBe("auto");
    const strict = buildEvents({ ...ledger, autopay: autopayRules.map((r) => (r.targetId === "bill-digi" ? { ...r, maxAmount: 50 } : r)) }, "acasa", 2026);
    const blocked = strict.find((e) => e.id === "bill-digi-2026-11");
    expect(blocked && eventState(blocked)).toBe("blocked");
    expect(blocked && isPayable(blocked)).toBe(true);
  });

  it("never autopays a suspicious bill", () => {
    const rule = { ...autopayRules[0], targetId: "bill-electrica", maxAmount: 5000 };
    const withRule = buildEvents({ ...ledger, autopay: [rule] }, "acasa", 2026);
    expect(withRule.find((e) => e.id === "bill-electrica-2026-11")?.autopay).toBe("blocked");
  });

  it("sends insurance to renewal instead of direct payment", () => {
    const rca = events2026.find((e) => e.id === "exp-rca-logan-2026");
    expect(rca && eventState(rca)).toBe("renew");
    expect(rca && isPayable(rca)).toBe(false);
  });

  it("finds the next unpaid event of a target", () => {
    expect(upcomingEvent(ledger, "acasa", "sub-chatgpt")?.date).toBe("2027-04-05");
    expect(upcomingEvent(ledger, "acasa", "sub-netflix")?.date).toBe("2026-11-21");
  });
});

describe("summaries", () => {
  it("adds paid and remaining amounts separately", () => {
    const november = eventsInMonth(events2026, 2026, 11);
    const { paid, remaining } = splitPaid(november);
    expect(paid + remaining).toBeCloseTo(
      november.reduce((s, e) => s + e.amount, 0),
      2,
    );
  });

  it("counts overdue and automatic payments of the month", () => {
    const summary = summarizeMonth(eventsInMonth(events2026, 2026, 11));
    expect(summary.overdueCount).toBe(1);
    expect(summary.autoCount).toBe(3);
    expect(summary.hasEstimates).toBe(false);
  });

  it("summarizes the year by category and month", () => {
    const summary = summarizeYear(events2026, 2026);
    const total = events2026.reduce((s, e) => s + e.amount, 0);
    expect(summary.total).toBeCloseTo(total, 2);
    expect(summary.averageMonthly).toBeCloseTo(total / 12, 2);
    expect(summary.byCategory.utilitati + summary.byCategory.abonamente + summary.byCategory.asigurari + summary.byCategory.servicii).toBeCloseTo(total, 2);
    expect(summary.peakMonths.length).toBeGreaterThan(0);
    expect(summary.peakMonths.length).toBeLessThanOrEqual(3);
  });
});

describe("calendar helpers", () => {
  it("counts the days of a month", () => {
    expect(monthDays(2026, 2)).toBe(28);
    expect(monthDays(2026, 11)).toBe(30);
  });

  it("starts weeks on Monday", () => {
    expect(weekdayIndex(2026, 11)).toBe(6);
  });
});
