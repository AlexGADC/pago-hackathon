import { describe, expect, it } from "vitest";
import { autopayRules, bills, defaultSettings, expiries, subscriptions, supplierConnections } from "@/data/mockFamilyData";
import { buildNotifications, findMissingBill, missingBillMonth, usualIssueDay, type NotificationInput } from "@/lib/notifications";
import { buildEvents, type LedgerData } from "@/lib/payments";
import type { Bill, DisputeTicket, SupplierConnection } from "@/types/pago";

const ticket: DisputeTicket = {
  id: "tkt-1",
  billId: "bill-electrica",
  houseId: "acasa",
  createdAt: "2026-11-16T12:00:00",
  stage: "in_analiza",
  legalDeadlineDays: 15,
  confidence: "Declarat manual de client (supus regularizării)",
  realIndex: 15.79,
  disputedAmount: 1469,
  paidAmount: 11,
  message: "Contest factura.",
};

function withElectrica(patch: Partial<Bill>): Bill[] {
  return bills.map((b) => (b.id === "bill-electrica" ? { ...b, ...patch } : b));
}

function notificationsFor(patch: Partial<NotificationInput> & { bills?: Bill[]; tickets?: DisputeTicket[] }) {
  const ledger: LedgerData = { bills: patch.bills ?? bills, subscriptions, expiries, payments: [], tickets: patch.tickets ?? [], autopay: autopayRules };
  const houseId = patch.houseId ?? "acasa";
  return buildNotifications({
    houseId,
    events: buildEvents(ledger, houseId, 2026),
    bills: ledger.bills,
    subscriptions,
    expiries,
    connections: supplierConnections,
    payments: [],
    tickets: ledger.tickets,
    readings: [],
    settings: defaultSettings,
    ...patch,
  });
}

describe("dispute notifications", () => {
  it("says the difference stays frozen while the supplier analyses the dispute", () => {
    const list = notificationsFor({ bills: withElectrica({ status: "platita_partial" }), tickets: [ticket] });
    const open = list.find((n) => n.id === "ticket-tkt-1-in_analiza");
    expect(open?.title).toBe("Electrica Furnizare analizează sesizarea ta");
    expect(open?.body).toContain("1.469 RON rămân înghețați");
  });

  it("announces the storno invoice and the amount saved", () => {
    const closed: DisputeTicket = { ...ticket, stage: "stornata", resolvedAt: "2026-11-16T12:05:00" };
    const list = notificationsFor({ bills: withElectrica({ status: "platita", amount: 11 }), tickets: [closed] });
    const storno = list.find((n) => n.id === "ticket-tkt-1-stornata");
    expect(storno).toMatchObject({ tone: "success", title: "Electrica Furnizare a emis factura storno", date: "2026-11-16", href: "/facturi/bill-electrica" });
    expect(storno?.body).toContain("Ai economisit 1.469 RON");
    expect(list.some((n) => n.body.includes("rămân înghețați"))).toBe(false);
  });
});

describe("missing bill detection", () => {
  const hidro = bills.find((b) => b.id === "bill-hidro-bunici") as Bill;
  const association = bills.find((b) => b.id === "bill-intretinere") as Bill;
  const MISSING_ID = "missing-bill-hidro-bunici-2026-11";

  function withHidro(patch: Partial<Bill>): Bill[] {
    return bills.map((b) => (b.id === "bill-hidro-bunici" ? { ...b, ...patch } : b));
  }

  function withHidroConnection(patch: Partial<SupplierConnection>): SupplierConnection[] {
    return supplierConnections.map((c) => (c.provider === "Hidroelectrica" ? { ...c, ...patch } : c));
  }

  it("takes the usual issue day from the last 12 months of bills", () => {
    expect(hidro.history).toHaveLength(12);
    expect(hidro.history.every((h) => h.issuedOn)).toBe(true);
    expect(usualIssueDay(hidro)).toBe(8);
    expect(usualIssueDay(association)).toBe(28);

    const shifted: Bill = { ...hidro, issueDate: "2026-10-03", history: hidro.history.map((h, i) => ({ ...h, issuedOn: `${h.month}-${i % 2 ? "11" : "12"}` })) };
    expect(usualIssueDay(shifted)).toBe(11);
  });

  it("falls back to the current bill when the history has no issue dates", () => {
    const bare: Bill = { ...hidro, issueDate: "2026-10-14", history: hidro.history.map(({ month, amount }) => ({ month, amount })) };
    expect(usualIssueDay(bare)).toBe(14);
  });

  it("flags the month only after the usual day plus a few days of grace", () => {
    expect(missingBillMonth(hidro, "2026-11-05")).toBeNull();
    expect(missingBillMonth(hidro, "2026-11-11")).toBeNull();
    expect(missingBillMonth(hidro, "2026-11-12")).toBe("2026-11");
    expect(missingBillMonth(hidro)).toBe("2026-11");
  });

  it("stays quiet once the bill of the month exists", () => {
    expect(missingBillMonth({ ...hidro, issueDate: "2026-11-09", dueDate: "2026-11-27" })).toBeNull();
    expect(missingBillMonth({ ...hidro, issueDate: "2026-10-31", dueDate: "2026-11-20" })).toBeNull();
  });

  it("handles suppliers that issue at the end of the month", () => {
    expect(missingBillMonth(association)).toBeNull();
    expect(missingBillMonth(association, "2026-12-01")).toBeNull();
    expect(missingBillMonth(association, "2026-12-02")).toBe("2026-11");
  });

  it("raises no false alarm for the other demo bills", () => {
    const flagged = bills.filter((b) => missingBillMonth(b) !== null).map((b) => b.id);
    expect(flagged).toEqual(["bill-hidro-bunici"]);
  });

  it("notifies only while the bill is missing and the supplier looks connected", () => {
    const missing = notificationsFor({ houseId: "bunici" }).find((n) => n.id === MISSING_ID);
    expect(missing).toMatchObject({ tone: "warning", title: "Hidroelectrica nu a trimis încă factura lunii noiembrie", href: "/facturi/furnizori" });
    expect(missing?.body).toContain("în jurul datei de 8");

    const arrived = notificationsFor({ houseId: "bunici", bills: withHidro({ issueDate: "2026-11-09", dueDate: "2026-11-27", status: "normala" }) });
    expect(arrived.some((n) => n.id.startsWith("missing-"))).toBe(false);

    const disconnected = notificationsFor({ houseId: "bunici", connections: withHidroConnection({ status: "deconectat" }) });
    expect(disconnected.some((n) => n.id.startsWith("missing-"))).toBe(false);
    expect(disconnected.some((n) => n.id === "conn-bunici-Hidroelectrica")).toBe(true);

    expect(notificationsFor({ houseId: "acasa" }).some((n) => n.id.startsWith("missing-"))).toBe(false);
  });

  it("describes the missing bill for the screens", () => {
    expect(findMissingBill(hidro, supplierConnections)).toEqual({ month: "2026-11", label: "noiembrie", usualDay: 8 });
    expect(findMissingBill(hidro, withHidroConnection({ status: "sincronizare" }))).toBeNull();
    expect(findMissingBill(hidro, [])).toBeNull();
  });
});
