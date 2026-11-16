import { describe, expect, it } from "vitest";
import { bills } from "@/data/mockFamilyData";
import { DEMO_TODAY, daysUntil, legalDeadlineDays, percentOverAverage, validateIndex } from "@/lib/disputes";

const electrica = bills.find((b) => b.id === "bill-electrica")!;
const digi = bills.find((b) => b.id === "bill-digi")!;

describe("validateIndex", () => {
  it("accepts an index between the last confirmed and the billed one", () => {
    const result = validateIndex(electrica, 15.79);
    expect(result).toEqual({ ok: true, consumption: expect.closeTo(10.79, 2), correctAmount: 11, disputedAmount: 1469 });
  });

  it("rejects an index below the last confirmed one", () => {
    expect(validateIndex(electrica, 3).ok).toBe(false);
  });

  it("rejects an index above the billed one", () => {
    expect(validateIndex(electrica, 2000).ok).toBe(false);
  });

  it("rejects a bill without a meter", () => {
    expect(validateIndex(digi, 10).ok).toBe(false);
  });

  it("rejects a value that is not a number", () => {
    expect(validateIndex(electrica, Number.NaN).ok).toBe(false);
  });
});

describe("legalDeadlineDays", () => {
  it("gives 30 days for telecom and waste bills", () => {
    expect(legalDeadlineDays({ ...electrica, kind: "telecom" })).toBe(30);
    expect(legalDeadlineDays({ ...electrica, kind: "salubritate" })).toBe(30);
  });

  it("gives 15 days for the other bills", () => {
    expect(legalDeadlineDays({ ...electrica, kind: "curent" })).toBe(15);
  });
});

describe("percentOverAverage", () => {
  it("compares the amount with the average", () => {
    expect(percentOverAverage({ ...electrica, amount: 1480, averageAmount: 260 })).toBe(469);
  });
});

describe("daysUntil", () => {
  it("counts days from the demo date", () => {
    expect(DEMO_TODAY).toBe("2026-11-16");
    expect(daysUntil("2026-11-21")).toBe(5);
    expect(daysUntil("2026-11-16")).toBe(0);
    expect(daysUntil("2026-11-14")).toBe(-2);
  });
});
