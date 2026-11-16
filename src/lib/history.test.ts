import { describe, expect, it } from "vitest";
import { autopayRules, bills, defaultSettings, expiries, subscriptions, supplierConnections } from "@/data/mockFamilyData";
import { DEFAULT_HISTORY_FILTERS, buildHistory, filterHistory, groupByMonth, historyCsv, sumConfirmed } from "@/lib/history";
import { buildNotifications } from "@/lib/notifications";
import { buildEvents, type LedgerData } from "@/lib/payments";
import type { PaymentRecord } from "@/types/pago";

const ledger: LedgerData = { bills, subscriptions, expiries, payments: [], tickets: [], autopay: autopayRules };
const events = [2025, 2026].flatMap((year) => buildEvents(ledger, "acasa", year));
const options = { houseId: "acasa", defaultMethodLabel: "Visa •••• 4821", autopayTargets: autopayRules.map((r) => r.targetId) };

const failed: PaymentRecord = {
  id: "pay-9-0",
  eventId: "bill-gaz-2026-11",
  targetId: "bill-gaz",
  targetKind: "bill",
  houseId: "acasa",
  title: "E.ON Energie",
  payee: "PAGO*E ON ENERGIE",
  category: "utilitati",
  amount: 182,
  fee: 0,
  discount: 0,
  pointsUsed: 0,
  pointsEarned: 0,
  methodId: "pm-visa",
  methodLabel: "Visa •••• 4821",
  status: "esuata",
  failureReason: "E.ON Energie este deconectat.",
  createdAt: "2026-11-16T12:00:00",
  reference: "PG-123456",
};

describe("payment history", () => {
  const history = buildHistory(events, [failed], options);

  it("lists past payments newest first, without future or estimated ones", () => {
    expect(history[0].id).toBe("pay-9-0");
    expect(history.every((r) => r.createdAt.slice(0, 10) <= "2026-11-16")).toBe(true);
    const dates = history.map((r) => r.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("marks payments of autopay targets as automatic", () => {
    const netflix = history.find((r) => r.title === "Netflix");
    const dropbox = history.find((r) => r.title === "Dropbox");
    expect(netflix?.auto).toBe(true);
    expect(dropbox?.auto).toBe(false);
  });

  it("does not duplicate an event that has a confirmed payment", () => {
    const confirmed: PaymentRecord = { ...failed, id: "pay-10-0", eventId: "sub-dropbox-2026-11", targetId: "sub-dropbox", targetKind: "subscription", title: "Dropbox", category: "abonamente", amount: 39, status: "confirmata", failureReason: undefined };
    const withPayment = buildHistory(events, [confirmed], options);
    expect(withPayment.filter((r) => r.eventId === "sub-dropbox-2026-11")).toHaveLength(1);
  });

  it("filters by period, category, status and text", () => {
    const month = filterHistory(history, { ...DEFAULT_HISTORY_FILTERS, period: "luna" });
    expect(month.every((r) => r.createdAt.startsWith("2026-11"))).toBe(true);

    const subs = filterHistory(history, { ...DEFAULT_HISTORY_FILTERS, period: "tot", category: "abonamente" });
    expect(subs.length).toBeGreaterThan(0);
    expect(subs.every((r) => r.category === "abonamente")).toBe(true);

    expect(filterHistory(history, { ...DEFAULT_HISTORY_FILTERS, status: "esuate" }).map((r) => r.id)).toEqual(["pay-9-0"]);
    expect(filterHistory(history, { ...DEFAULT_HISTORY_FILTERS, period: "tot", query: "romania" }).every((r) => r.title === "Digi România")).toBe(true);
    expect(filterHistory(history, { ...DEFAULT_HISTORY_FILTERS, period: "tot", query: "PG-123456" })).toHaveLength(1);
  });

  it("keeps the three month window to the last three calendar months", () => {
    const recent = filterHistory(history, DEFAULT_HISTORY_FILTERS);
    expect(recent.every((r) => r.createdAt.slice(0, 7) >= "2026-09")).toBe(true);
    expect(recent.some((r) => r.createdAt.startsWith("2026-09"))).toBe(true);
  });

  it("sums only confirmed payments and groups them by month", () => {
    const month = filterHistory(history, { ...DEFAULT_HISTORY_FILTERS, period: "luna" });
    expect(sumConfirmed(month)).toBeCloseTo(
      month.filter((r) => r.status === "confirmata").reduce((sum, r) => sum + r.amount, 0),
      2,
    );
    const groups = groupByMonth(filterHistory(history, DEFAULT_HISTORY_FILTERS));
    expect(groups.map((g) => g.month)).toEqual(["2026-11", "2026-10", "2026-09"]);
  });

  it("exports a CSV with a header and one line per payment", () => {
    const month = filterHistory(history, { ...DEFAULT_HISTORY_FILTERS, period: "luna" });
    const lines = historyCsv(month).split("\n");
    expect(lines[0]).toBe('"Data","Furnizor","Categorie","Suma (RON)","Status","Metodă","Referință"');
    expect(lines).toHaveLength(month.length + 1);
    expect(lines[1]).toContain('"E.ON Energie"');
    expect(lines[1]).toContain('"Eșuată"');
  });
});

describe("notifications", () => {
  const notifications = buildNotifications({
    houseId: "acasa",
    events: buildEvents(ledger, "acasa", 2026),
    bills,
    subscriptions,
    expiries,
    connections: supplierConnections,
    payments: [failed],
    tickets: [],
    readings: [],
    settings: defaultSettings,
  });
  const ids = notifications.map((n) => n.id);

  it("raises the alerts that need action first", () => {
    expect(notifications[0].tone).toBe("alert");
    expect(ids).toContain("flag-bill-electrica");
    expect(ids).toContain("conn-acasa-E.ON Energie");
    expect(ids).toContain("fail-pay-9-0");
    expect(ids).toContain("due-bill-intretinere-2026-11-0");
  });

  it("warns about subscriptions before they cost more", () => {
    expect(ids).toContain("price-sub-netflix-59.99");
    expect(ids).toContain("trial-sub-icloud");
    expect(ids).toContain("unused-sub-disney");
  });

  it("announces automatic payments only inside the notice window", () => {
    expect(ids).not.toContain("auto-bill-digi-2026-11");
    const later = buildNotifications({
      houseId: "acasa",
      events: buildEvents(ledger, "acasa", 2026),
      bills,
      subscriptions,
      expiries,
      connections: supplierConnections,
      payments: [],
      tickets: [],
      readings: [],
      settings: defaultSettings,
      today: "2026-11-18",
    }).map((n) => n.id);
    expect(later).toContain("auto-bill-digi-2026-11");
  });

  it("does not repeat the trial alert as a plain due reminder", () => {
    expect(ids.filter((id) => id.includes("sub-icloud"))).toEqual(["trial-sub-icloud"]);
  });

  it("keeps only the latest payment confirmations", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ ...failed, id: `pay-ok-${i}`, eventId: `svc-${i}`, status: "confirmata" as const, failureReason: undefined }));
    const list = buildNotifications({
      houseId: "acasa",
      events: buildEvents(ledger, "acasa", 2026),
      bills,
      subscriptions,
      expiries,
      connections: supplierConnections,
      payments: many,
      tickets: [],
      readings: [],
      settings: defaultSettings,
    }).map((n) => n.id);
    expect(list.filter((id) => id.startsWith("ok-"))).toEqual(["ok-pay-ok-2", "ok-pay-ok-3", "ok-pay-ok-4"]);
  });

  it("warns about expiring insurance but not about distant dates", () => {
    expect(ids).toContain("exp-exp-rca-logan-2026-11-29");
    expect(ids).not.toContain("exp-exp-rov-logan-2027-01-14");
  });

  it("reminds about the open self-reading window and the budget", () => {
    expect(ids).toContain("reading-bill-gaz-2026-11");
    expect(ids).not.toContain("reading-bill-electrica-2026-11");
    expect(ids).toContain("budget-2026-11");
  });

  it("stays quiet for another profile's data", () => {
    const other = buildNotifications({
      houseId: "bunici",
      events: buildEvents(ledger, "bunici", 2026),
      bills,
      subscriptions,
      expiries,
      connections: supplierConnections,
      payments: [failed],
      tickets: [],
      readings: [],
      settings: { ...defaultSettings, monthlyBudget: null },
    }).map((n) => n.id);
    expect(other).toContain("flag-bill-retim");
    expect(other).not.toContain("flag-bill-electrica");
    expect(other).not.toContain("fail-pay-9-0");
  });
});
