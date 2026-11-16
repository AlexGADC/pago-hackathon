import { describe, expect, it } from "vitest";
import { subscriptions } from "@/data/mockFamilyData";
import { isUnused, monthlyCost, nextRenewal, potentialSavings, priceIncrease, totalMonthly, totalYearly, trialDaysLeft, yearlyCost } from "@/lib/subscriptions";

const byId = (id: string) => {
  const sub = subscriptions.find((s) => s.id === id);
  if (!sub) throw new Error(`missing ${id}`);
  return sub;
};

const home = subscriptions.filter((s) => s.houseId === "acasa");

describe("subscription costs", () => {
  it("spreads yearly and quarterly prices over months", () => {
    expect(monthlyCost(byId("sub-chatgpt"))).toBe(100);
    expect(monthlyCost(byId("sub-antivirus"))).toBeCloseTo(29.997, 2);
    expect(yearlyCost(byId("sub-netflix"))).toBeCloseTo(719.88, 2);
    expect(yearlyCost(byId("sub-antivirus"))).toBeCloseTo(359.96, 2);
  });

  it("counts only active subscriptions in totals", () => {
    const active = home.filter((s) => s.status === "activ");
    expect(totalMonthly(home)).toBeCloseTo(
      active.reduce((sum, s) => sum + monthlyCost(s), 0),
      2,
    );
    expect(totalYearly(home)).toBeCloseTo(totalMonthly(home) * 12, 2);
    expect(active.some((s) => s.id === "sub-sala")).toBe(false);
  });
});

describe("renewals", () => {
  it("finds the next charge from today", () => {
    expect(nextRenewal(byId("sub-netflix"), "2026-11-16")).toBe("2026-11-21");
    expect(nextRenewal(byId("sub-dropbox"), "2026-11-16")).toBe("2026-12-09");
    expect(nextRenewal(byId("sub-chatgpt"), "2026-11-16")).toBe("2027-04-05");
    expect(nextRenewal(byId("sub-antivirus"), "2026-11-16")).toBe("2026-12-15");
  });

  it("has no next charge while paused or cancelled", () => {
    expect(nextRenewal(byId("sub-sala"), "2026-11-16")).toBeNull();
    expect(nextRenewal(byId("sub-hbo"), "2026-11-16")).toBeNull();
  });
});

describe("alerts", () => {
  it("detects price increases and their yearly impact", () => {
    expect(priceIncrease(byId("sub-netflix"))).toEqual({ delta: expect.closeTo(10, 2), yearlyDelta: expect.closeTo(120, 2) });
    expect(priceIncrease(byId("sub-spotify"))).toBeNull();
  });

  it("counts the days left in a trial", () => {
    expect(trialDaysLeft(byId("sub-icloud"), "2026-11-16")).toBe(3);
    expect(trialDaysLeft(byId("sub-icloud"), "2026-11-20")).toBeNull();
    expect(trialDaysLeft(byId("sub-netflix"), "2026-11-16")).toBeNull();
  });

  it("flags active subscriptions that were not used for two months", () => {
    expect(isUnused(byId("sub-disney"))).toBe(true);
    expect(isUnused(byId("sub-hbo"))).toBe(false);
    expect(potentialSavings(home)).toBeCloseTo(yearlyCost(byId("sub-disney")), 2);
  });
});
