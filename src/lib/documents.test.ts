import { describe, expect, it } from "vitest";
import { advancePayments, markPaidExternally, startPayments } from "@/context/actions";
import { createInitialState, type AppState } from "@/context/appState";
import { disputeDocument, disputeNumber, fmtMoney, receiptDocument, type DocumentContext } from "@/lib/documents";
import { buildHistory } from "@/lib/history";
import { buildEvents, toCheckoutItem } from "@/lib/payments";
import type { CheckoutItem, DisputeTicket } from "@/types/pago";

const NOW = "2026-11-16T10:24:00";
const NBSP = String.fromCharCode(160);

function contextOf(state: AppState, payerName = "Alexandru Popescu"): DocumentContext {
  return { payerName, houses: state.houses, bills: state.bills, subscriptions: state.subscriptions, expiries: state.expiries, tickets: state.tickets, generatedAt: NOW };
}

function eventItem(state: AppState, eventId: string): CheckoutItem {
  const ledger = { bills: state.bills, subscriptions: state.subscriptions, expiries: state.expiries, payments: state.payments, tickets: state.tickets, autopay: state.autopay };
  const event = buildEvents(ledger, "acasa", 2026).find((e) => e.id === eventId);
  if (!event) throw new Error(`missing event ${eventId}`);
  return toCheckoutItem(event);
}

function confirm(state: AppState, items: CheckoutItem[], stamp: number, usePoints = false): AppState {
  return advancePayments(advancePayments(startPayments(state, { items, methodId: "pm-visa", usePoints, now: NOW, stamp })));
}

function labels(rows: { label: string }[]): string[] {
  return rows.map((row) => row.label);
}

function valueOf(rows: { label: string; value: string }[], label: string): string | undefined {
  return rows.find((row) => row.label === label)?.value;
}

const meterTicket: DisputeTicket = {
  id: "tkt-bill-electrica-test",
  billId: "bill-electrica",
  houseId: "acasa",
  createdAt: NOW,
  stage: "trimisa",
  legalDeadlineDays: 15,
  confidence: "Declarat manual de client (supus regularizării)",
  realIndex: 15.79,
  disputedAmount: 1469,
  paidAmount: 11,
  message: "Către Electrica Furnizare: contest factura.",
};

describe("money in documents", () => {
  it("always shows two decimals and the thousands separator", () => {
    expect(fmtMoney(62)).toBe("62,00 RON");
    expect(fmtMoney(59.99)).toBe("59,99 RON");
    expect(fmtMoney(1480)).toBe("1.480,00 RON");
    expect(fmtMoney(0)).toBe("0,00 RON");
  });
});

describe("receipt document", () => {
  it("describes a confirmed bill payment with its invoice, discount and points", () => {
    const base = createInitialState();
    const state = confirm(base, [eventItem(base, "bill-digi-2026-11")], 1_794_000_000_000, true);
    const record = state.payments[0];
    const doc = receiptDocument(record, contextOf(state));

    expect(doc.heading).toBe("Chitanță de plată");
    expect(doc.number).toBe(record.reference);
    expect(doc.status).toEqual({ label: "Confirmată", tone: "success" });
    expect(doc.amount).toBe("50,00 RON");
    expect(doc.subtitle).toBe("Facturi · Factură de utilități");
    expect(doc.payer).toEqual({ label: "Plătitor", name: "Alexandru Popescu", lines: ["Casa Noastră", "Str. Lalelelor 12, Cluj-Napoca"] });
    expect(doc.payee.lines[0]).toBe("Pe extrasul bancar: PAGO*DIGI ROMANIA");
    expect(labels(doc.details)).toEqual(["Tip plată", "Serviciu", "Număr factură", "Cod client", "Scadență", "Metodă de plată", "Data plății", "Referință"]);
    expect(valueOf(doc.details, "Număr factură")).toBe("DIGI-55102938");
    expect(valueOf(doc.details, "Scadență")).toBe("20 nov 2026");
    expect(doc.summary).toEqual([
      { label: "Valoarea serviciului", value: "62,00 RON" },
      { label: "Reducere din 1.200 puncte Pago", value: "−12,00 RON" },
      { label: "Comision Pago", value: "0,00 RON" },
    ]);
    expect(doc.total).toEqual({ label: "Total plătit", value: "50,00 RON" });
    expect(doc.points).toBe("Ai primit 5 puncte Pago pentru această plată.");
    expect(doc.steps.map((step) => step.state)).toEqual(["done", "done", "done"]);
    expect(doc.note).toBeNull();
    expect(doc.fileName).toBe(`chitanta-${record.reference}.pdf`);
  });

  it("describes a subscription payment from history, with the paid period", () => {
    const base = createInitialState();
    const events = buildEvents({ ...base, payments: [], tickets: [] }, "acasa", 2026);
    const history = buildHistory(events, [], { houseId: "acasa", defaultMethodLabel: "Visa •••• 4821", autopayTargets: ["sub-netflix"] });
    const record = history.find((r) => r.eventId === "sub-netflix-2026-10");
    if (!record) throw new Error("missing subscription history");
    const doc = receiptDocument(record, contextOf(base));

    expect(doc.subtitle).toBe("Abonamente · Abonament");
    expect(doc.badges).toEqual(["Plată automată"]);
    expect(valueOf(doc.details, "Categorie")).toBe("Filme și seriale");
    expect(valueOf(doc.details, "Facturare")).toBe("Lunar");
    expect(valueOf(doc.details, "Perioada plătită")).toBe("Octombrie 2026");
    expect(valueOf(doc.details, "Următoarea plată")).toBe("21 nov 2026");
  });

  it("describes an insurance renewal with the new validity and a quick payment", () => {
    const base = createInitialState();
    const renewal: CheckoutItem = {
      eventId: "exp-rca-logan-2026",
      targetId: "exp-rca-logan",
      targetKind: "expiry",
      houseId: "acasa",
      title: "RCA · Dacia Logan · CJ-12-POP",
      amount: 1090,
      category: "asigurari",
      renew: { expiresOn: "2027-11-29", price: 1090, provider: "Groupama" },
    };
    const topUp: CheckoutItem = { eventId: "svc-topup-test", targetKind: "extra", houseId: "acasa", title: "Reîncărcare Orange", amount: 25, category: "servicii" };
    const state = confirm(base, [renewal, topUp], 1_794_000_000_100);

    const insurance = receiptDocument(state.payments[0], contextOf(state));
    expect(insurance.subtitle).toBe("Asigurări · Asigurare RCA");
    expect(valueOf(insurance.details, "Pentru")).toBe("Dacia Logan · CJ-12-POP");
    expect(valueOf(insurance.details, "Emitent")).toBe("Groupama");
    expect(insurance.payee.name).toBe("Groupama");
    expect(insurance.title).toBe("RCA · Dacia Logan · CJ-12-POP");
    expect(insurance.steps[2].detail).toBe("Groupama a înregistrat plata.");
    expect(valueOf(insurance.details, "Valabil până pe")).toBe("29 nov 2027");

    const quick = receiptDocument(state.payments[1], contextOf(state));
    expect(quick.subtitle).toBe("Alte plăți · Plată rapidă");
    expect(valueOf(quick.details, "Serviciu")).toBe("Reîncărcare Orange");
    expect(quick.points).toBe("Ai primit 3 puncte Pago pentru această plată.");
  });

  it("says plainly when a payment failed or is still on its way", () => {
    const base = createInitialState();
    const started = startPayments(base, { items: [eventItem(base, "bill-gaz-2026-11")], methodId: "pm-visa", usePoints: false, now: NOW, stamp: 1_794_000_000_200 });
    const pending = receiptDocument(started.payments[0], contextOf(started));
    expect(pending.heading).toBe("Plată în curs");
    expect(pending.total.label).toBe("Total de plată");
    expect(pending.steps.map((step) => step.state)).toEqual(["done", "active", "todo"]);

    const failedState = advancePayments(started);
    const failed = receiptDocument(failedState.payments[0], contextOf(failedState));
    expect(failed.heading).toBe("Plată nereușită");
    expect(failed.status).toEqual({ label: "Eșuată", tone: "alert" });
    expect(failed.total.label).toBe("Total neîncasat");
    expect(failed.steps.map((step) => step.state)).toEqual(["done", "failed"]);
    expect(failed.note).toContain("E.ON Energie este deconectat");
    expect(failed.points).toBeNull();
  });

  it("marks a payment made outside the app", () => {
    const base = createInitialState();
    const state = markPaidExternally(base, eventItem(base, "bill-intretinere-2026-11"), NOW, 1_794_000_000_300);
    const doc = receiptDocument(state.payments[0], contextOf(state, "Familia Popescu"));
    expect(doc.badges).toEqual(["În afara aplicației"]);
    expect(doc.payee.lines).toEqual(["Plată făcută în afara aplicației"]);
    expect(doc.steps).toHaveLength(1);
    expect(doc.payer.name).toBe("Familia Popescu");
  });
});

describe("dispute document", () => {
  it("lays out a metered dispute with the indexes, the amounts and the requests", () => {
    const state = { ...createInitialState(), tickets: [meterTicket] };
    const bill = state.bills.find((b) => b.id === "bill-electrica");
    if (!bill) throw new Error("missing demo bill");
    const doc = disputeDocument(meterTicket, bill, contextOf(state));

    expect(doc.number).toBe(disputeNumber(meterTicket));
    expect(doc.number).toMatch(/^SZ-\d{6}$/);
    expect(doc.status).toEqual({ label: "Trimisă", tone: "info" });
    expect(doc.subject).toBe(`Contestarea facturii EFS-2026-1183427 din 5${NBSP}nov${NBSP}2026`);
    expect(doc.recipient.name).toBe("Electrica Furnizare");
    expect(doc.sender.lines).toEqual(["Cod client: 5001234567", "Loc de consum: Str. Lalelelor 12, Cluj-Napoca"]);
    expect(valueOf(doc.invoice, "Suma facturată")).toBe("1.480,00 RON");
    expect(valueOf(doc.invoice, "Față de medie")).toBe("+469%");
    expect(doc.reasonTitle).toBe("Index estimat greșit");
    expect(doc.reasonRows).toEqual([
      { label: "Ultimul index", value: "5 kWh" },
      { label: "Index facturat", value: "1.485 kWh" },
      { label: "Index real", value: "15,79 kWh" },
      { label: "Consum real", value: "10,79 kWh" },
      { label: "Preț unitar", value: "1 RON/kWh" },
    ]);
    expect(doc.flagged).toEqual([]);
    expect(doc.amounts.map((amount) => amount.value)).toEqual(["1.480,00 RON", "11,00 RON", "1.469,00 RON"]);
    expect(doc.requests[0]).toBe("Suspendarea plății pentru diferența de 1.469,00 RON, până la soluționarea sesizării.");
    expect(doc.requests[2]).toBe("Un răspuns în scris în termenul legal de 15 zile lucrătoare de la primirea sesizării.");
    expect(doc.resolution).toBeNull();
    expect(doc.fileName).toBe(`sesizare-${doc.number}.pdf`);
  });

  it("keeps the original amounts after the storno rewrote the bill", () => {
    const base = createInitialState();
    const original = base.bills.find((b) => b.id === "bill-electrica");
    if (!original?.meter) throw new Error("missing demo bill");
    const corrected = { ...original, amount: 11, status: "platita" as const, meter: { ...original.meter, billedIndex: 15.79 } };
    const closed: DisputeTicket = { ...meterTicket, stage: "stornata", resolvedAt: "2026-11-16T10:31:00" };
    const doc = disputeDocument(closed, corrected, contextOf({ ...base, tickets: [closed] }));

    expect(doc.status).toEqual({ label: "Soluționată prin storno", tone: "success" });
    expect(valueOf(doc.invoice, "Suma facturată")).toBe("1.480,00 RON");
    expect(labels(doc.reasonRows)).toEqual(["Ultimul index", "Index real", "Consum real", "Preț unitar"]);
    expect(doc.resolution).toBe("Electrica Furnizare a emis factura storno pe 16 nov 2026, 10:31. Diferența de 1.469,00 RON a fost anulată, iar factura corectă este de 11,00 RON.");
  });

  it("lists the contested lines for a bill without a meter and gives the calendar deadline", () => {
    const base = createInitialState();
    const bill = base.bills.find((b) => b.id === "bill-retim");
    if (!bill?.anomaly) throw new Error("missing demo bill");
    const ticket: DisputeTicket = {
      id: "tkt-bill-retim-test",
      billId: bill.id,
      houseId: bill.houseId,
      createdAt: NOW,
      stage: "in_analiza",
      legalDeadlineDays: 30,
      confidence: "Confirmat de client (fără contor)",
      disputedAmount: bill.amount - bill.anomaly.expectedAmount,
      paidAmount: bill.anomaly.expectedAmount,
      message: "Către Retim: contest factura.",
    };
    const doc = disputeDocument(ticket, bill, contextOf({ ...base, tickets: [ticket] }));

    expect(doc.status.label).toBe("În analiză la furnizor");
    expect(doc.reasonTitle).toBe("Sumă nejustificată pe factură");
    expect(doc.reasonText).toBe(bill.anomaly.reason);
    expect(doc.reasonRows).toEqual([]);
    expect(doc.flagged).toEqual(bill.anomaly.suspiciousLines);
    expect(doc.sender.lines[1]).toBe("Loc de consum: Str. Morii 4, Turda");
    expect(doc.requests[2]).toBe("Un răspuns în scris în termenul legal de 30 de zile, adică până pe 16 dec 2026.");
    expect(doc.declaration).toContain("nu corespunde serviciilor primite");
  });

  it("asks to suspend the whole amount when nothing was paid", () => {
    const base = createInitialState();
    const bill = base.bills.find((b) => b.id === "bill-electrica");
    if (!bill) throw new Error("missing demo bill");
    const ticket: DisputeTicket = { ...meterTicket, realIndex: 5, paidAmount: 0, disputedAmount: 1480 };
    const doc = disputeDocument(ticket, bill, contextOf({ ...base, tickets: [ticket] }));
    expect(doc.requests[0]).toBe("Suspendarea plății pentru întreaga sumă de 1.480,00 RON, până la soluționarea sesizării.");
    expect(doc.amounts[1]).toEqual({ label: "Sumă achitată", value: "0,00 RON", tone: "success" });
  });
});
