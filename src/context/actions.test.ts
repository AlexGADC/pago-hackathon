import { describe, expect, it } from "vitest";
import { PROVIDER_CATALOG } from "@/data/catalog";
import { POINTS } from "@/data/mockFamilyData";
import { buildNotifications } from "@/lib/notifications";
import { buildEvents } from "@/lib/payments";
import type { CheckoutItem, DisputeTicket } from "@/types/pago";
import * as actions from "./actions";
import { createInitialState, restoreState, type AppState } from "./appState";

const NOW = "2026-11-16T12:00:00";
const LATER = "2026-11-16T12:05:00";

const digi: CheckoutItem = { eventId: "bill-digi-2026-11", targetId: "bill-digi", targetKind: "bill", houseId: "acasa", title: "Digi România", amount: 62, category: "utilitati" };
const gaz: CheckoutItem = { eventId: "bill-gaz-2026-11", targetId: "bill-gaz", targetKind: "bill", houseId: "acasa", title: "E.ON Energie", amount: 182, category: "utilitati" };
const maintenance: CheckoutItem = { eventId: "bill-intretinere-2026-11", targetId: "bill-intretinere", targetKind: "bill", houseId: "acasa", title: "Asociația de proprietari M4", amount: 320, category: "utilitati" };

function settle(state: AppState): AppState {
  return actions.advancePayments(actions.advancePayments(state));
}

function ledgerOf(state: AppState) {
  return { bills: state.bills, subscriptions: state.subscriptions, expiries: state.expiries, payments: state.payments, tickets: state.tickets, autopay: state.autopay };
}

function electricaEvent(state: AppState) {
  return buildEvents(ledgerOf(state), "acasa", 2026).find((e) => e.id === "bill-electrica-2026-11");
}

function notificationIds(state: AppState, today = "2026-11-16"): string[] {
  return buildNotifications({
    houseId: "acasa",
    events: buildEvents(ledgerOf(state), "acasa", 2026, today),
    bills: state.bills,
    subscriptions: state.subscriptions,
    expiries: state.expiries,
    connections: state.connections,
    payments: state.payments,
    tickets: state.tickets,
    readings: state.readings,
    settings: state.settings,
    autopayLog: state.autopayLog,
    today,
  }).map((n) => n.id);
}

function lastLog(state: AppState) {
  return state.autopayLog[state.autopayLog.length - 1];
}

describe("payments", () => {
  it("moves a payment from processing to sent to confirmed", () => {
    const started = actions.startPayments(createInitialState(), { items: [digi], methodId: "pm-visa", usePoints: false, now: NOW, stamp: 1 });
    expect(started.payments).toHaveLength(1);
    expect(started.payments[0]).toMatchObject({ status: "procesare", payee: "PAGO*DIGI ROMANIA", methodLabel: "Visa •••• 4821", fee: 0 });

    const sent = actions.advancePayments(started);
    expect(sent.payments[0].status).toBe("trimisa");
    expect(sent.bills.find((b) => b.id === "bill-digi")?.status).toBe("normala");

    const confirmed = actions.advancePayments(sent);
    expect(confirmed.payments[0]).toMatchObject({ status: "confirmata", pointsEarned: 6 });
    expect(confirmed.bills.find((b) => b.id === "bill-digi")?.status).toBe("platita");
    expect(confirmed.points).toBe(started.points + 6);
  });

  it("fails a payment to a disconnected supplier and says why", () => {
    const done = settle(actions.startPayments(createInitialState(), { items: [gaz], methodId: "pm-visa", usePoints: false, now: NOW, stamp: 2 }));
    expect(done.payments[0].status).toBe("esuata");
    expect(done.payments[0].failureReason).toContain("deconectat");
    expect(done.bills.find((b) => b.id === "bill-gaz")?.status).toBe("normala");
  });

  it("succeeds after the supplier is reconnected", () => {
    const reconnected = actions.finishSync(actions.reconnect(createInitialState(), "E.ON Energie", "acasa"), NOW);
    expect(reconnected.connections.find((c) => c.provider === "E.ON Energie")).toMatchObject({ status: "conectat", problem: undefined });
    const done = settle(actions.startPayments(reconnected, { items: [gaz], methodId: "pm-visa", usePoints: false, now: NOW, stamp: 3 }));
    expect(done.payments[0].status).toBe("confirmata");
  });

  it("rejects an expired card before any money moves", () => {
    const started = actions.startPayments(createInitialState(), { items: [digi], methodId: "pm-mc", usePoints: true, now: NOW, stamp: 4 });
    expect(started.payments[0].status).toBe("esuata");
    expect(started.payments[0].failureReason).toContain("expirat");
    expect(started.points).toBe(createInitialState().points);
  });

  it("applies the points discount to the largest payment of a batch", () => {
    const initial = createInitialState();
    const started = actions.startPayments(initial, { items: [digi, maintenance], methodId: "pm-visa", usePoints: true, now: NOW, stamp: 5 });
    const [first, second] = started.payments;
    expect(first.discount).toBe(0);
    expect(second.discount).toBe(24);
    expect(second.amount).toBe(296);
    expect(started.points).toBe(initial.points - 2400);
    expect(first.batchId).toBe(second.batchId);
  });

  it("refunds points when a discounted payment fails", () => {
    const initial = createInitialState();
    const done = settle(actions.startPayments(initial, { items: [gaz], methodId: "pm-visa", usePoints: true, now: NOW, stamp: 6 }));
    expect(done.payments[0].status).toBe("esuata");
    expect(done.points).toBe(initial.points);
  });

  it("records a payment made outside the app without points", () => {
    const initial = createInitialState();
    const marked = actions.markPaidExternally(initial, maintenance, NOW, 7);
    expect(marked.payments[0]).toMatchObject({ status: "confirmata", external: true, pointsEarned: 0 });
    expect(marked.bills.find((b) => b.id === "bill-intretinere")?.status).toBe("platita");
    expect(marked.points).toBe(initial.points);
  });

  it("extends an insurance when its renewal payment is confirmed", () => {
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
    const done = settle(actions.startPayments(createInitialState(), { items: [renewal], methodId: "pm-visa", usePoints: false, now: NOW, stamp: 8 }));
    expect(done.expiries.find((e) => e.id === "exp-rca-logan")).toMatchObject({ expiresOn: "2027-11-29", price: 1090 });
  });
});

describe("disputes", () => {
  const ticket: DisputeTicket = {
    id: "tkt-1",
    billId: "bill-electrica",
    houseId: "acasa",
    createdAt: NOW,
    stage: "trimisa",
    legalDeadlineDays: 15,
    confidence: "Declarat manual de client (supus regularizării)",
    realIndex: 15.79,
    disputedAmount: 1469,
    paidAmount: 11,
    message: "Contest factura.",
  };

  it("freezes the difference and pays only the undisputed amount", () => {
    const initial = createInitialState();
    const sent = actions.submitDispute(initial, ticket, NOW, 9);
    expect(sent.bills.find((b) => b.id === "bill-electrica")?.status).toBe("contestata");
    expect(sent.payments[0]).toMatchObject({ amount: 11, status: "procesare", eventId: "bill-electrica-2026-11" });
    expect(sent.points).toBe(initial.points + POINTS.bounty);
    expect(sent.missions.find((m) => m.kind === "bounty")?.completed).toBe(true);

    const done = settle(sent);
    expect(done.bills.find((b) => b.id === "bill-electrica")?.status).toBe("platita_partial");
  });

  it("moves the ticket to analysis", () => {
    const sent = actions.submitDispute(createInitialState(), ticket, NOW, 10);
    expect(actions.advanceTickets(sent).tickets[0].stage).toBe("in_analiza");
  });

  it("closes the ticket with a storno invoice and releases the frozen amount", () => {
    const analysed = actions.advanceTickets(settle(actions.submitDispute(createInitialState(), ticket, NOW, 16)));
    expect(electricaEvent(analysed)).toMatchObject({ amount: 11, frozen: 1469, paid: true });

    const closed = actions.resolveTickets(analysed, LATER);
    expect(closed.tickets[0]).toMatchObject({ stage: "stornata", resolvedAt: LATER, disputedAmount: 1469 });
    const bill = closed.bills.find((b) => b.id === "bill-electrica");
    expect(bill).toMatchObject({ status: "platita", amount: 11 });
    expect(bill?.meter?.billedIndex).toBe(15.79);
    expect(electricaEvent(closed)).toMatchObject({ amount: 11, frozen: 0, paid: true });
    expect(actions.resolveTickets(closed, LATER)).toBe(closed);
  });

  it("leaves the corrected bill payable when the storno arrives before the payment", () => {
    const analysed = actions.advanceTickets(actions.submitDispute(createInitialState(), ticket, NOW, 17));
    expect(analysed.bills.find((b) => b.id === "bill-electrica")?.status).toBe("contestata");

    const closed = actions.resolveTickets(analysed, LATER);
    expect(closed.bills.find((b) => b.id === "bill-electrica")).toMatchObject({ status: "normala", amount: 11 });
    expect(electricaEvent(closed)).toMatchObject({ amount: 11, frozen: 0, paid: false });
    expect(settle(closed).bills.find((b) => b.id === "bill-electrica")?.status).toBe("platita");
  });

  it("does not close a ticket the supplier has not picked up yet", () => {
    const sent = actions.submitDispute(createInitialState(), ticket, NOW, 18);
    expect(actions.resolveTickets(sent, LATER)).toBe(sent);
  });
});

describe("providers", () => {
  const template = PROVIDER_CATALOG.find((p) => p.name === "Orange România");

  it("connects a provider and brings its current bill", () => {
    if (!template) throw new Error("missing template");
    const connected = actions.connectProvider(createInitialState(), { template, houseId: "acasa", clientCode: "OR-1", now: NOW, stamp: 11 });
    expect(connected.connections.find((c) => c.provider === "Orange România")?.status).toBe("sincronizare");
    const bill = connected.bills.find((b) => b.provider === "Orange România");
    expect(bill).toMatchObject({ houseId: "acasa", amount: 78, status: "normala", dueDate: "2026-11-18", clientCode: "OR-1" });
    expect(bill?.history).toHaveLength(12);
  });

  it("does not connect the same provider twice", () => {
    if (!template) throw new Error("missing template");
    const once = actions.connectProvider(createInitialState(), { template, houseId: "acasa", clientCode: "OR-1", now: NOW, stamp: 12 });
    expect(actions.connectProvider(once, { template, houseId: "acasa", clientCode: "OR-2", now: NOW, stamp: 13 })).toBe(once);
  });

  it("removes a provider together with its bill and autopay rule", () => {
    const removed = actions.removeProvider(createInitialState(), "Digi România", "acasa");
    expect(removed.bills.some((b) => b.id === "bill-digi")).toBe(false);
    expect(removed.connections.some((c) => c.provider === "Digi România")).toBe(false);
    expect(removed.autopay.some((r) => r.targetId === "bill-digi")).toBe(false);
  });
});

describe("subscriptions, autopay and cards", () => {
  it("pauses a subscription and stops its autopay", () => {
    const paused = actions.setSubscriptionStatus(createInitialState(), "sub-netflix", "pauza", "2026-11-16");
    expect(paused.subscriptions.find((s) => s.id === "sub-netflix")).toMatchObject({ status: "pauza", statusChangedOn: "2026-11-16" });
    expect(paused.autopay.find((r) => r.targetId === "sub-netflix")?.enabled).toBe(false);

    const resumed = actions.setSubscriptionStatus(paused, "sub-netflix", "activ", "2026-11-17");
    expect(resumed.subscriptions.find((s) => s.id === "sub-netflix")).toMatchObject({ status: "activ", statusChangedOn: undefined });
  });

  it("logs every autopay consent change", () => {
    const initial = createInitialState();
    const saved = actions.saveAutopay(initial, { targetId: "sub-disney", targetKind: "subscription", maxAmount: 50, methodId: "pm-visa", noticeDays: 3, name: "Disney+", now: NOW, stamp: 14 });
    expect(saved.autopay.find((r) => r.targetId === "sub-disney")).toMatchObject({ enabled: true, maxAmount: 50 });
    expect(saved.autopayLog).toHaveLength(initial.autopayLog.length + 1);
    expect(saved.autopayLog[saved.autopayLog.length - 1].text).toContain("activată");

    const stopped = actions.disableAutopay(saved, "sub-disney", "Disney+", NOW, 15);
    expect(stopped.autopay.find((r) => r.targetId === "sub-disney")?.enabled).toBe(false);
    expect(stopped.autopayLog[stopped.autopayLog.length - 1].text).toContain("oprită");
  });

  it("keeps one default card and moves autopay off a removed card", () => {
    const added = actions.addMethod(createInitialState(), { id: "pm-new", brand: "visa", last4: "0000", holder: "Test", expMonth: 1, expYear: 2030, label: "Nou", isDefault: true });
    expect(added.methods.filter((m) => m.isDefault).map((m) => m.id)).toEqual(["pm-new"]);

    const removed = actions.removeMethod(actions.setDefaultMethod(added, "pm-visa"), "pm-visa");
    expect(removed.methods.filter((m) => m.isDefault)).toHaveLength(1);
    expect(removed.autopay.every((r) => r.methodId !== "pm-visa")).toBe(true);
  });

  it("completes the self-reading mission once", () => {
    const initial = createInitialState();
    const first = actions.submitReading(initial, "bill-gaz", 4330, NOW);
    expect(first.readings).toEqual([{ billId: "bill-gaz", index: 4330, submittedAt: NOW }]);
    expect(first.points).toBe(initial.points + POINTS.autocitire);
    const second = actions.submitReading(first, "bill-gaz", 4335, NOW);
    expect(second.readings).toHaveLength(1);
    expect(second.points).toBe(first.points);
  });
});

describe("autopay runs", () => {
  const spotify = { targetId: "sub-spotify", targetKind: "subscription" as const, methodId: "pm-visa", noticeDays: 3, name: "Spotify Family", now: NOW };

  it("pays a scheduled payment on its due date through the usual payment flow", () => {
    const initial = createInitialState();
    const ran = actions.runAutopay(initial, NOW);
    expect(ran.payments).toHaveLength(1);
    expect(ran.payments[0]).toMatchObject({ eventId: "sub-spotify-2026-11", amount: 39.99, status: "procesare", methodId: "pm-visa", auto: true });
    expect(ran.payments[0].reference).toMatch(/^PG-\d{6}$/);
    expect(lastLog(ran)).toMatchObject({ kind: "paid", targetId: "sub-spotify", eventId: "sub-spotify-2026-11" });
    expect(lastLog(ran).text).toContain("39,99 RON");

    const done = settle(ran);
    expect(done.payments[0]).toMatchObject({ status: "confirmata", pointsEarned: 4 });
    expect(done.points).toBe(initial.points + 4);
    expect(actions.runAutopay(ran, NOW)).toBe(ran);
    expect(actions.runAutopay(done, NOW)).toBe(done);
  });

  it("waits for the due date of payments that are only announced", () => {
    const today = actions.runAutopay(createInitialState(), NOW);
    expect(today.payments.map((p) => p.eventId)).toEqual(["sub-spotify-2026-11"]);

    const onDigiDueDate = actions.runAutopay(createInitialState(), "2026-11-20T08:00:00");
    expect(onDigiDueDate.payments.map((p) => p.eventId)).toEqual(["bill-digi-2026-11"]);
    expect(settle(onDigiDueDate).bills.find((b) => b.id === "bill-digi")?.status).toBe("platita");
  });

  it("does not pay above the limit and asks for confirmation instead", () => {
    const lowered = actions.saveAutopay(createInitialState(), { ...spotify, maxAmount: 30, stamp: 30 });
    expect(notificationIds(lowered)).toContain("autoblock-sub-spotify-2026-11");

    const ran = actions.runAutopay(lowered, NOW);
    expect(ran.payments).toHaveLength(0);
    expect(lastLog(ran)).toMatchObject({ kind: "skipped", eventId: "sub-spotify-2026-11" });
    expect(lastLog(ran).text).toContain("depășește limita de 30 RON");
    expect(notificationIds(ran)).toContain("autoskip-sub-spotify-2026-11");
    expect(notificationIds(ran)).not.toContain("autoblock-sub-spotify-2026-11");
    expect(actions.runAutopay(ran, NOW)).toBe(ran);

    const raised = actions.runAutopay(actions.saveAutopay(ran, { ...spotify, maxAmount: 60, stamp: 31 }), NOW);
    expect(raised.payments.map((p) => p.eventId)).toEqual(["sub-spotify-2026-11"]);
    expect(notificationIds(settle(raised))).not.toContain("autoskip-sub-spotify-2026-11");
  });

  it("does not pay a suspicious bill automatically", () => {
    const withRule = actions.saveAutopay(createInitialState(), { targetId: "bill-electrica", targetKind: "bill", maxAmount: 2000, methodId: "pm-visa", noticeDays: 3, name: "Electrica Furnizare", now: NOW, stamp: 32 });
    expect(notificationIds(withRule, "2026-11-20")).toContain("autoblock-bill-electrica-2026-11");

    const ran = actions.runAutopay(withRule, "2026-11-25T08:00:00");
    expect(ran.payments).toHaveLength(0);
    expect(lastLog(ran)).toMatchObject({ kind: "skipped", targetId: "bill-electrica", eventId: "bill-electrica-2026-11" });
    expect(lastLog(ran).text).toContain("pare greșită");
    expect(notificationIds(ran, "2026-11-25")).toContain("autoskip-bill-electrica-2026-11");
    expect(ran.bills.find((b) => b.id === "bill-electrica")?.status).toBe("red_flag");
  });

  it("does not charge an expired card", () => {
    const oldCard = actions.saveAutopay(createInitialState(), { ...spotify, methodId: "pm-mc", maxAmount: 60, stamp: 33 });
    const ran = actions.runAutopay(oldCard, NOW);
    expect(ran.payments).toHaveLength(0);
    expect(lastLog(ran)).toMatchObject({ kind: "skipped", eventId: "sub-spotify-2026-11" });
    expect(lastLog(ran).text).toContain("cardul ales nu mai e valabil");
    expect(notificationIds(ran)).toContain("autoskip-sub-spotify-2026-11");
  });

  it("renews an insurance automatically for another year", () => {
    const withRule = actions.saveAutopay(createInitialState(), { targetId: "exp-rca-logan", targetKind: "expiry", maxAmount: 1500, methodId: "pm-visa", noticeDays: 7, name: "RCA · Dacia Logan", now: NOW, stamp: 34 });
    const done = settle(actions.runAutopay(withRule, "2026-11-29T08:00:00"));
    expect(done.payments).toHaveLength(1);
    expect(done.payments[0]).toMatchObject({ eventId: "exp-rca-logan-2026", amount: 1150, status: "confirmata", auto: true });
    expect(done.expiries.find((e) => e.id === "exp-rca-logan")).toMatchObject({ expiresOn: "2027-11-29", price: 1150, provider: "Groupama" });
  });
});

describe("saved state", () => {
  it("ignores data saved by an older version", () => {
    expect(restoreState({ version: 1, points: 5 }).points).toBe(createInitialState().points);
  });

  it("restores saved data and falls back to a valid profile", () => {
    const restored = restoreState({ ...createInitialState(), points: 5, activeHouse: "sters" });
    expect(restored.points).toBe(5);
    expect(restored.activeHouse).toBe("acasa");
  });
});
