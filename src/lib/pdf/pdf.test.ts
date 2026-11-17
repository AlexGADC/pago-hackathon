import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { advancePayments, startPayments, submitDispute } from "@/context/actions";
import { createInitialState, type AppState } from "@/context/appState";
import { disputeDocument, receiptDocument, type DocumentContext } from "@/lib/documents";
import { buildHistory } from "@/lib/history";
import { buildEvents, toCheckoutItem } from "@/lib/payments";
import type { CheckoutItem, DisputeTicket, PaymentRecord } from "@/types/pago";
import type { FontBytes } from "./canvas";
import { renderDispute } from "./dispute";
import { renderReceipt } from "./receipt";

const NOW = "2026-11-16T10:24:00";
const fontDir = path.join(process.cwd(), "public", "fonts");
const fonts: FontBytes = { regular: readFileSync(path.join(fontDir, "Inter-Regular.ttf")), bold: readFileSync(path.join(fontDir, "Inter-SemiBold.ttf")) };
const outDir = process.env.PAGO_PDF_OUT;

function contextOf(state: AppState, payerName = "Alexandru Popescu"): DocumentContext {
  return { payerName, houses: state.houses, bills: state.bills, subscriptions: state.subscriptions, expiries: state.expiries, tickets: state.tickets, generatedAt: NOW };
}

function eventItem(state: AppState, houseId: string, eventId: string): CheckoutItem {
  const ledger = { bills: state.bills, subscriptions: state.subscriptions, expiries: state.expiries, payments: state.payments, tickets: state.tickets, autopay: state.autopay };
  const event = buildEvents(ledger, houseId, 2026).find((e) => e.id === eventId);
  if (!event) throw new Error(`missing event ${eventId}`);
  return toCheckoutItem(event);
}

function pay(state: AppState, items: CheckoutItem[], stamp: number, usePoints = false): AppState {
  return advancePayments(advancePayments(startPayments(state, { items, methodId: "pm-visa", usePoints, now: NOW, stamp })));
}

function save(name: string, bytes: Uint8Array): void {
  if (!outDir) return;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, name), bytes);
}

async function inspect(bytes: Uint8Array) {
  expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  const doc = await PDFDocument.load(bytes);
  return { pages: doc.getPageCount(), title: doc.getTitle(), author: doc.getAuthor(), size: bytes.length };
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
  message: "Către Electrica Furnizare: contest factura EFS-2026-1183427. Indexul facturat este estimat greșit.",
};

describe("receipt pdf", () => {
  it("renders a one page receipt for a confirmed bill payment", async () => {
    const state = pay(createInitialState(), [eventItem(createInitialState(), "acasa", "bill-digi-2026-11")], 1_794_000_000_000, true);
    const record = state.payments[0];
    expect(record.status).toBe("confirmata");
    const bytes = await renderReceipt(receiptDocument(record, contextOf(state)), fonts);
    save("chitanta-factura.pdf", bytes);
    const info = await inspect(bytes);
    expect(info.pages).toBe(1);
    expect(info.title).toBe(`Chitanță de plată ${record.reference}`);
    expect(info.author).toBe("Pago Home & Family");
    expect(info.size).toBeLessThan(120_000);
  });

  it("renders subscription, insurance and quick payment receipts on one page", async () => {
    const base = createInitialState();
    const history = buildHistory(buildEvents({ ...base, payments: [], tickets: [] }, "acasa", 2026), [], { houseId: "acasa", defaultMethodLabel: "Visa •••• 4821", autopayTargets: ["sub-netflix"] });
    const netflix = history.find((r) => r.targetId === "sub-netflix");
    if (!netflix) throw new Error("missing subscription history");
    const rca = base.expiries.find((e) => e.id === "exp-rca-logan");
    if (!rca) throw new Error("missing demo insurance");
    const renewal: CheckoutItem = {
      eventId: "exp-rca-logan-2026",
      targetId: rca.id,
      targetKind: "expiry",
      houseId: "acasa",
      title: `RCA · ${rca.subject}`,
      amount: 1090,
      category: "asigurari",
      renew: { expiresOn: "2027-11-29", price: 1090, provider: "Groupama" },
    };
    const topUp: CheckoutItem = { eventId: "svc-topup-test", targetKind: "extra", houseId: "acasa", title: "Reîncărcare Orange", amount: 25, category: "servicii" };
    const paid = pay(base, [renewal, topUp], 1_794_000_000_100);

    const samples: [string, PaymentRecord, AppState][] = [
      ["chitanta-abonament.pdf", netflix, base],
      ["chitanta-asigurare.pdf", paid.payments[0], paid],
      ["chitanta-serviciu.pdf", paid.payments[1], paid],
    ];
    for (const [name, record, state] of samples) {
      const bytes = await renderReceipt(receiptDocument(record, contextOf(state)), fonts);
      save(name, bytes);
      expect((await inspect(bytes)).pages).toBe(1);
    }
  });

  it("keeps a failed payment and a long supplier name on one page", async () => {
    const base = createInitialState();
    const failedState = advancePayments(startPayments(base, { items: [eventItem(base, "acasa", "bill-gaz-2026-11")], methodId: "pm-visa", usePoints: false, now: NOW, stamp: 1_794_000_000_200 }));
    const failed = failedState.payments[0];
    expect(failed.status).toBe("esuata");
    const bytes = await renderReceipt(receiptDocument(failed, contextOf(failedState)), fonts);
    save("chitanta-esuata.pdf", bytes);
    const info = await inspect(bytes);
    expect(info.pages).toBe(1);
    expect(info.title).toBe(`Plată nereușită ${failed.reference}`);

    const long: PaymentRecord = { ...failed, status: "confirmata", failureReason: undefined, title: "Asociația de proprietari a blocului M4 din strada Lalelelor numărul 12, scara B 🏠", payee: "PAGO*ASOCIATIA DE PROPR" };
    const longBytes = await renderReceipt(receiptDocument(long, contextOf(failedState, "Alexandru-Constantin Popescu-Ionescu")), fonts);
    save("chitanta-nume-lung.pdf", longBytes);
    expect((await inspect(longBytes)).pages).toBe(1);
  });
});

describe("dispute pdf", () => {
  it("renders the complaint for a metered bill", async () => {
    const state = submitDispute(createInitialState(), meterTicket, NOW, 1_794_000_000_300);
    const bill = state.bills.find((b) => b.id === "bill-electrica");
    if (!bill) throw new Error("missing demo bill");
    const bytes = await renderDispute(disputeDocument(state.tickets[0], bill, contextOf(state)), fonts);
    save("sesizare-contor.pdf", bytes);
    const info = await inspect(bytes);
    expect(info.pages).toBeLessThanOrEqual(2);
    expect(info.title).toMatch(/^Sesizare SZ-\d{6}$/);
    expect(info.size).toBeLessThan(140_000);
  });

  it("renders the complaint for a bill without a meter, also after the storno", async () => {
    const base = createInitialState();
    const bill = base.bills.find((b) => b.id === "bill-retim");
    if (!bill?.anomaly) throw new Error("missing demo bill");
    const ticket: DisputeTicket = {
      id: "tkt-bill-retim-test",
      billId: bill.id,
      houseId: bill.houseId,
      createdAt: NOW,
      stage: "stornata",
      legalDeadlineDays: 30,
      confidence: "Confirmat de client (fără contor)",
      disputedAmount: bill.amount - bill.anomaly.expectedAmount,
      paidAmount: bill.anomaly.expectedAmount,
      message: `Către ${bill.provider}: contest factura ${bill.invoiceNumber}.`,
      resolvedAt: "2026-11-16T10:31:00",
    };
    const bytes = await renderDispute(disputeDocument(ticket, bill, contextOf({ ...base, tickets: [ticket] }, "Familia Popescu")), fonts);
    save("sesizare-fara-contor.pdf", bytes);
    expect((await inspect(bytes)).pages).toBeLessThanOrEqual(2);
  });
});
