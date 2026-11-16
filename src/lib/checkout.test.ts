import { describe, expect, it } from "vitest";
import { paymentMethods } from "@/data/mockFamilyData";
import { cardExpiryLabel, cardLabel, checkoutTotals, isCardExpired, makeReference, maxDiscount, payeeLabel, pointsEarned, pointsValue } from "@/lib/checkout";
import { suggestedLimit } from "@/lib/autopay";
import { fmtRon } from "@/lib/disputes";
import { addDays, addMonths, fmtDate, fmtDay, fmtLongDate, initials, plural } from "@/lib/format";
import type { CheckoutItem } from "@/types/pago";

const item = (amount: number): CheckoutItem => ({ eventId: `e-${amount}`, targetKind: "bill", houseId: "acasa", title: "Test", amount, category: "utilitati" });

describe("points", () => {
  it("earns one point for every 10 RON, at least one", () => {
    expect(pointsEarned(62)).toBe(6);
    expect(pointsEarned(3)).toBe(1);
    expect(pointsEarned(0)).toBe(0);
  });

  it("caps the discount at a fifth of the payment and at the points owned", () => {
    expect(maxDiscount(2450, 62)).toBe(12);
    expect(maxDiscount(2450, 1000)).toBe(24);
    expect(maxDiscount(50, 1000)).toBe(0);
    expect(pointsValue(2450)).toBe(24);
  });

  it("computes checkout totals with zero fee", () => {
    expect(checkoutTotals([item(62), item(320)], 2450, true)).toEqual({ subtotal: 382, discount: 24, pointsUsed: 2400, fee: 0, total: 358 });
    expect(checkoutTotals([item(59.99), item(39.99)], 0, true)).toEqual({ subtotal: 99.98, discount: 0, pointsUsed: 0, fee: 0, total: 99.98 });
  });
});

describe("cards and references", () => {
  const [visa, old] = paymentMethods;

  it("knows when a card is expired", () => {
    expect(isCardExpired(visa, "2026-11-16")).toBe(false);
    expect(isCardExpired(old, "2026-11-16")).toBe(true);
    expect(isCardExpired(old, "2026-10-31")).toBe(false);
  });

  it("labels cards without exposing the number", () => {
    expect(cardLabel(visa)).toBe("Visa •••• 4821");
    expect(cardExpiryLabel(visa)).toBe("08/28");
  });

  it("builds the bank statement name without diacritics", () => {
    expect(payeeLabel("Digi România")).toBe("PAGO*DIGI ROMANIA");
    expect(payeeLabel("Asociația de proprietari M4")).toBe("PAGO*ASOCIATIA DE PROPR");
  });

  it("builds stable payment references", () => {
    expect(makeReference("pay-1-0")).toMatch(/^PG-\d{6}$/);
    expect(makeReference("pay-1-0")).toBe(makeReference("pay-1-0"));
  });

  it("suggests an autopay limit above the usual amount", () => {
    expect(suggestedLimit(62)).toBe(80);
    expect(suggestedLimit(175)).toBe(220);
  });
});

describe("formatting", () => {
  it("formats money with two decimals only when needed", () => {
    expect(fmtRon(62)).toBe("62 RON");
    expect(fmtRon(59.99)).toBe("59,99 RON");
    expect(fmtRon(162.5)).toBe("162,50 RON");
    expect(fmtRon(1480)).toBe("1.480 RON");
  });

  it("formats dates in Romanian", () => {
    expect(fmtDay("2026-11-25")).toBe("25 nov");
    expect(fmtDate("2026-11-25T10:00:00")).toBe("25 nov 2026");
    expect(fmtLongDate("2026-11-16")).toBe("luni, 16 noiembrie");
  });

  it("moves dates by days and months", () => {
    expect(addDays("2026-11-29", 7)).toBe("2026-12-06");
    expect(addMonths("2026-11-29", 12)).toBe("2027-11-29");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("uses the Romanian plural with „de” from twenty up", () => {
    expect(plural(1, "zi", "zile")).toBe("1 zi");
    expect(plural(4, "zi", "zile")).toBe("4 zile");
    expect(plural(20, "zi", "zile")).toBe("20 de zile");
    expect(plural(101, "zi", "zile")).toBe("101 zile");
    expect(plural(120, "zi", "zile")).toBe("120 de zile");
  });

  it("builds initials for badges", () => {
    expect(initials("Netflix")).toBe("NE");
    expect(initials("E.ON Energie")).toBe("EO");
    expect(initials("Disney+")).toBe("DI");
    expect(initials("Sală 18GYM")).toBe("SA");
    expect(initials("iCloud 200 GB")).toBe("IG");
  });
});
