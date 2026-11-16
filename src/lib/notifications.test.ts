import { describe, expect, it } from "vitest";
import { autopayRules, bills, defaultSettings, expiries, subscriptions, supplierConnections } from "@/data/mockFamilyData";
import { buildNotifications, type NotificationInput } from "@/lib/notifications";
import { buildEvents, type LedgerData } from "@/lib/payments";
import type { Bill, DisputeTicket } from "@/types/pago";

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
  return buildNotifications({
    houseId: "acasa",
    events: buildEvents(ledger, "acasa", 2026),
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
