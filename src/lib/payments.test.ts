import { describe, expect, it } from "vitest";
import { buildEvents, eventsInMonth, monthDays, splitPaid, summarizeYear, weekdayIndex } from "@/lib/payments";

const events2026 = buildEvents("acasa", 2026);

describe("buildEvents", () => {
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

  it("can place two payments on the same day", () => {
    const november25 = eventsInMonth(events2026, 2026, 11).filter((e) => e.date === "2026-11-25");
    expect(november25.map((e) => e.title).sort()).toEqual(["Disney+", "Electrica Furnizare"]);
  });

  it("marks past payments as paid and future ones as unpaid", () => {
    const october = eventsInMonth(events2026, 2026, 10);
    expect(october.every((e) => e.paid)).toBe(true);
    const december = eventsInMonth(events2026, 2026, 12);
    expect(december.every((e) => !e.paid)).toBe(true);
  });

  it("keeps events sorted by date", () => {
    const dates = events2026.map((e) => e.date);
    expect([...dates].sort()).toEqual(dates);
  });
});

describe("splitPaid", () => {
  it("adds paid and remaining amounts separately", () => {
    const november = eventsInMonth(events2026, 2026, 11);
    const { paid, remaining } = splitPaid(november);
    const total = november.reduce((s, e) => s + e.amount, 0);
    expect(paid + remaining).toBeCloseTo(total, 2);
  });
});

describe("summarizeYear", () => {
  const summary = summarizeYear(events2026, 2026);

  it("sums every payment of the year", () => {
    const total = events2026.reduce((s, e) => s + e.amount, 0);
    expect(summary.total).toBeCloseTo(total, 2);
  });

  it("computes the average monthly cost over twelve months", () => {
    expect(summary.averageMonthly).toBeCloseTo(summary.total / 12, 2);
  });

  it("splits the total by category", () => {
    const sum = summary.byCategory.utilitati + summary.byCategory.abonamente + summary.byCategory.asigurari;
    expect(sum).toBeCloseTo(summary.total, 2);
  });

  it("lists the peak months, at most three", () => {
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
