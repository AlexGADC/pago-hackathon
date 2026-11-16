import type { ProviderTemplate } from "@/data/catalog";
import { monthlyHistory, POINTS } from "@/data/mockFamilyData";
import {
  cardLabel,
  checkoutTotals,
  EXTERNAL_METHOD_ID,
  EXTERNAL_METHOD_LABEL,
  isCardExpired,
  makeReference,
  payeeLabel,
  pointsEarned,
  POINTS_PER_RON,
  round2,
} from "@/lib/checkout";
import { DEMO_TODAY, fmtRon } from "@/lib/disputes";
import { addDays, addMonths, pad2 } from "@/lib/format";
import { billEventId } from "@/lib/payments";
import type {
  AutopayRule,
  Bill,
  CheckoutItem,
  DisputeTicket,
  ExpiryItem,
  FamilyMember,
  House,
  HouseId,
  PaymentMethod,
  PaymentRecord,
  Settings,
  SplitRequest,
  Subscription,
  SubscriptionStatus,
  SupportTicket,
  TargetKind,
} from "@/types/pago";
import type { AppState } from "./appState";

export interface PayInput {
  items: CheckoutItem[];
  methodId: string;
  usePoints: boolean;
  now: string;
  stamp: number;
}

export function startPayments(state: AppState, input: PayInput): AppState {
  const method = state.methods.find((m) => m.id === input.methodId);
  if (!method || input.items.length === 0) return state;

  const totals = checkoutTotals(input.items, state.points, input.usePoints);
  const expired = isCardExpired(method, DEMO_TODAY);
  const largest = input.items.reduce((best, item, index) => (item.amount > input.items[best].amount ? index : best), 0);

  const records: PaymentRecord[] = input.items.map((item, index) => {
    const discount = !expired && index === largest ? totals.discount : 0;
    const id = `pay-${input.stamp}-${index}`;
    return {
      id,
      eventId: item.eventId,
      targetId: item.targetId,
      targetKind: item.targetKind,
      houseId: item.houseId,
      title: item.title,
      payee: payeeLabel(item.title),
      category: item.category,
      amount: round2(item.amount - discount),
      fee: 0,
      discount,
      pointsUsed: discount * POINTS_PER_RON,
      pointsEarned: 0,
      methodId: method.id,
      methodLabel: cardLabel(method),
      status: expired ? "esuata" : "procesare",
      failureReason: expired ? "Cardul a expirat, așa că plata nu a fost inițiată. Alege alt card și încearcă din nou." : undefined,
      createdAt: input.now,
      reference: makeReference(id),
      batchId: input.items.length > 1 ? `batch-${input.stamp}` : undefined,
      renew: item.renew,
    };
  });

  return { ...state, points: expired ? state.points : state.points - totals.pointsUsed, payments: [...state.payments, ...records] };
}

function applyConfirmation(state: AppState, record: PaymentRecord): AppState {
  let next = state;
  if (record.targetKind === "bill") {
    next = {
      ...next,
      bills: next.bills.map((b) => {
        if (b.id !== record.targetId || billEventId(b) !== record.eventId) return b;
        if (b.status === "contestata") return { ...b, status: "platita_partial" as const };
        if (b.status === "platita_partial") return b;
        return { ...b, status: "platita" as const };
      }),
    };
  }
  if (record.targetKind === "expiry" && record.renew) {
    const patch = record.renew;
    next = {
      ...next,
      expiries: next.expiries.map((e) => (e.id === record.targetId ? { ...e, expiresOn: patch.expiresOn, price: patch.price, provider: patch.provider ?? e.provider } : e)),
    };
  }
  return next;
}

export function advancePayments(state: AppState): AppState {
  if (!state.payments.some((p) => p.status === "procesare" || p.status === "trimisa")) return state;

  let next = state;
  const payments: PaymentRecord[] = [];
  for (const p of state.payments) {
    if (p.status === "procesare") {
      const connection = state.connections.find((c) => c.provider === p.title && c.houseId === p.houseId);
      if (connection?.status === "deconectat") {
        next = { ...next, points: next.points + p.pointsUsed };
        payments.push({
          ...p,
          status: "esuata",
          failureReason: `${p.title} este deconectat, așa că plata nu a putut fi trimisă. Banii nu au plecat din cont. Reconectează furnizorul și încearcă din nou.`,
        });
      } else {
        payments.push({ ...p, status: "trimisa" });
      }
      continue;
    }
    if (p.status === "trimisa") {
      const earned = pointsEarned(p.amount);
      const confirmed: PaymentRecord = { ...p, status: "confirmata", pointsEarned: earned };
      next = applyConfirmation({ ...next, points: next.points + earned }, confirmed);
      payments.push(confirmed);
      continue;
    }
    payments.push(p);
  }
  return { ...next, payments };
}

export function markPaidExternally(state: AppState, item: CheckoutItem, now: string, stamp: number): AppState {
  const id = `pay-${stamp}-ext`;
  const expiry = item.targetKind === "expiry" ? state.expiries.find((e) => e.id === item.targetId) : undefined;
  const record: PaymentRecord = {
    id,
    eventId: item.eventId,
    targetId: item.targetId,
    targetKind: item.targetKind,
    houseId: item.houseId,
    title: item.title,
    payee: payeeLabel(item.title),
    category: item.category,
    amount: item.amount,
    fee: 0,
    discount: 0,
    pointsUsed: 0,
    pointsEarned: 0,
    methodId: EXTERNAL_METHOD_ID,
    methodLabel: EXTERNAL_METHOD_LABEL,
    status: "confirmata",
    createdAt: now,
    reference: makeReference(id),
    external: true,
    renew: item.renew ?? (expiry ? { expiresOn: addMonths(expiry.expiresOn < DEMO_TODAY ? DEMO_TODAY : expiry.expiresOn, 12), price: expiry.price } : undefined),
  };
  return applyConfirmation({ ...state, payments: [...state.payments, record] }, record);
}

export function submitDispute(state: AppState, ticket: DisputeTicket, now: string, stamp: number): AppState {
  const bill = state.bills.find((b) => b.id === ticket.billId);
  if (!bill) return state;
  const method = state.methods.find((m) => m.isDefault) ?? state.methods[0];
  const payable = ticket.paidAmount > 0 && Boolean(method);

  const base: AppState = {
    ...state,
    tickets: [...state.tickets.filter((t) => t.billId !== ticket.billId), ticket],
    bills: state.bills.map((b) => (b.id === bill.id ? { ...b, status: payable ? ("contestata" as const) : ("platita_partial" as const) } : b)),
    points: state.points + POINTS.bounty,
    missions: state.missions.map((m) => (m.kind === "bounty" ? { ...m, completed: true } : m)),
  };
  if (!payable || !method) return base;

  return startPayments(base, {
    items: [{ eventId: billEventId(bill), targetId: bill.id, targetKind: "bill", houseId: bill.houseId, title: bill.provider, amount: ticket.paidAmount, category: "utilitati" }],
    methodId: method.id,
    usePoints: false,
    now,
    stamp,
  });
}

export function advanceTickets(state: AppState): AppState {
  if (!state.tickets.some((t) => t.stage === "trimisa")) return state;
  return { ...state, tickets: state.tickets.map((t) => (t.stage === "trimisa" ? { ...t, stage: "in_analiza" as const } : t)) };
}

export function reconnect(state: AppState, provider: string, houseId: HouseId): AppState {
  return {
    ...state,
    connections: state.connections.map((c) => (c.provider === provider && c.houseId === houseId && c.status === "deconectat" ? { ...c, status: "sincronizare" as const } : c)),
  };
}

export function finishSync(state: AppState, now: string): AppState {
  if (!state.connections.some((c) => c.status === "sincronizare")) return state;
  return {
    ...state,
    connections: state.connections.map((c) => (c.status === "sincronizare" ? { ...c, status: "conectat" as const, problem: undefined, lastSyncAt: now } : c)),
  };
}

export interface ConnectInput {
  template: ProviderTemplate;
  houseId: HouseId;
  clientCode: string;
  now: string;
  stamp: number;
}

const NEW_BILL_JITTER = [12, 20, 24, 15, 4, -10, -16, -20, -18, -12, -4, 6];

export function connectProvider(state: AppState, input: ConnectInput): AppState {
  const { template, houseId } = input;
  if (state.connections.some((c) => c.provider === template.name && c.houseId === houseId)) return state;

  const sameMonth = `${DEMO_TODAY.slice(0, 8)}${pad2(template.dueDay)}`;
  const dueDate = sameMonth >= DEMO_TODAY ? sameMonth : addMonths(sameMonth, 1);
  const prefix = template.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  const bill: Bill = {
    id: `bill-${input.stamp}`,
    houseId,
    provider: template.name,
    kind: template.kind,
    flow: template.flow,
    invoiceNumber: `${prefix}-${String(input.stamp).slice(-7)}`,
    clientCode: input.clientCode,
    issueDate: addDays(dueDate, -20),
    dueDate,
    amount: template.amount,
    averageAmount: template.average,
    history: monthlyHistory(template.average, template.flow === "A" ? NEW_BILL_JITTER : []),
    status: "normala",
    meter:
      template.unit && template.pricePerUnit
        ? { unit: template.unit, pricePerUnit: template.pricePerUnit, lastConfirmedIndex: 1200, billedIndex: 1200 + Math.round(template.amount / template.pricePerUnit) }
        : undefined,
    selfReading: template.selfReading,
  };

  return {
    ...state,
    connections: [...state.connections, { provider: template.name, houseId, status: "sincronizare", lastSyncAt: input.now }],
    bills: [...state.bills, bill],
  };
}

export function removeProvider(state: AppState, provider: string, houseId: HouseId): AppState {
  const removed = state.bills.filter((b) => b.provider === provider && b.houseId === houseId).map((b) => b.id);
  return {
    ...state,
    connections: state.connections.filter((c) => !(c.provider === provider && c.houseId === houseId)),
    bills: state.bills.filter((b) => !removed.includes(b.id)),
    tickets: state.tickets.filter((t) => !removed.includes(t.billId)),
    autopay: state.autopay.filter((r) => !removed.includes(r.targetId)),
  };
}

export function addSubscription(state: AppState, sub: Subscription): AppState {
  return { ...state, subscriptions: [...state.subscriptions, sub] };
}

export function updateSubscription(state: AppState, id: string, patch: Partial<Subscription>): AppState {
  return { ...state, subscriptions: state.subscriptions.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
}

export function setSubscriptionStatus(state: AppState, id: string, status: SubscriptionStatus, date: string): AppState {
  return {
    ...state,
    subscriptions: state.subscriptions.map((s) => (s.id === id ? { ...s, status, statusChangedOn: status === "activ" ? undefined : date } : s)),
    autopay: status === "activ" ? state.autopay : state.autopay.map((r) => (r.targetId === id ? { ...r, enabled: false } : r)),
  };
}

export function removeSubscription(state: AppState, id: string): AppState {
  return { ...state, subscriptions: state.subscriptions.filter((s) => s.id !== id), autopay: state.autopay.filter((r) => r.targetId !== id) };
}

export function addExpiry(state: AppState, item: ExpiryItem): AppState {
  return { ...state, expiries: [...state.expiries, item] };
}

export function updateExpiry(state: AppState, id: string, patch: Partial<ExpiryItem>): AppState {
  return { ...state, expiries: state.expiries.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
}

export function removeExpiry(state: AppState, id: string): AppState {
  return { ...state, expiries: state.expiries.filter((e) => e.id !== id), autopay: state.autopay.filter((r) => r.targetId !== id) };
}

export interface AutopayInput {
  targetId: string;
  targetKind: TargetKind;
  maxAmount: number;
  methodId: string;
  noticeDays: number;
  name: string;
  now: string;
  stamp: number;
}

export function saveAutopay(state: AppState, input: AutopayInput): AppState {
  const existing = state.autopay.find((r) => r.targetId === input.targetId);
  const rule: AutopayRule = {
    targetId: input.targetId,
    targetKind: input.targetKind,
    enabled: true,
    maxAmount: input.maxAmount,
    methodId: input.methodId,
    noticeDays: input.noticeDays,
    createdAt: existing?.createdAt ?? input.now,
  };
  const verb = existing?.enabled ? "actualizată" : "activată";
  return {
    ...state,
    autopay: existing ? state.autopay.map((r) => (r.targetId === input.targetId ? rule : r)) : [...state.autopay, rule],
    autopayLog: [
      ...state.autopayLog,
      { id: `log-${input.stamp}`, targetId: input.targetId, at: input.now, text: `Plată automată ${verb} pentru ${input.name}, cu limita de ${fmtRon(input.maxAmount)}.` },
    ],
  };
}

export function disableAutopay(state: AppState, targetId: string, name: string, now: string, stamp: number): AppState {
  if (!state.autopay.some((r) => r.targetId === targetId && r.enabled)) return state;
  return {
    ...state,
    autopay: state.autopay.map((r) => (r.targetId === targetId ? { ...r, enabled: false } : r)),
    autopayLog: [...state.autopayLog, { id: `log-${stamp}`, targetId, at: now, text: `Plată automată oprită pentru ${name}.` }],
  };
}

export function addMethod(state: AppState, method: PaymentMethod): AppState {
  const makeDefault = method.isDefault || state.methods.length === 0;
  const others = makeDefault ? state.methods.map((m) => ({ ...m, isDefault: false })) : state.methods;
  return { ...state, methods: [...others, { ...method, isDefault: makeDefault }] };
}

export function setDefaultMethod(state: AppState, id: string): AppState {
  if (!state.methods.some((m) => m.id === id)) return state;
  return { ...state, methods: state.methods.map((m) => ({ ...m, isDefault: m.id === id })) };
}

export function removeMethod(state: AppState, id: string): AppState {
  const removed = state.methods.find((m) => m.id === id);
  if (!removed) return state;
  const rest = state.methods.filter((m) => m.id !== id);
  const heir = rest.find((m) => !isCardExpired(m, DEMO_TODAY)) ?? rest[0];
  const methods = removed.isDefault && heir ? rest.map((m) => ({ ...m, isDefault: m.id === heir.id })) : rest;
  const fallback = methods.find((m) => m.isDefault);
  return {
    ...state,
    methods,
    autopay: state.autopay.map((r) => (r.methodId !== id ? r : fallback ? { ...r, methodId: fallback.id } : { ...r, enabled: false })),
  };
}

export function updateSettings(state: AppState, patch: Partial<Settings>): AppState {
  return { ...state, settings: { ...state.settings, ...patch } };
}

export function addHouse(state: AppState, house: House): AppState {
  return { ...state, houses: [...state.houses, house], activeHouse: house.id };
}

export function setActiveHouse(state: AppState, id: HouseId): AppState {
  return state.houses.some((h) => h.id === id) ? { ...state, activeHouse: id } : state;
}

export function inviteMember(state: AppState, member: FamilyMember): AppState {
  return { ...state, members: [...state.members, member] };
}

export function removeMember(state: AppState, id: string): AppState {
  return { ...state, members: state.members.filter((m) => m.id !== id) };
}

export function completeMission(state: AppState, id: string): AppState {
  const mission = state.missions.find((m) => m.id === id);
  if (!mission || mission.completed) return state;
  return { ...state, points: state.points + mission.points, missions: state.missions.map((m) => (m.id === id ? { ...m, completed: true } : m)) };
}

export function submitReading(state: AppState, billId: string, index: number, now: string): AppState {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill?.meter) return state;
  const mission = state.missions.find((m) => m.kind === "autocitire" && !m.completed);
  const monthKey = now.slice(0, 7);
  return {
    ...state,
    readings: [...state.readings.filter((r) => !(r.billId === billId && r.submittedAt.slice(0, 7) === monthKey)), { billId, index, submittedAt: now }],
    missions: mission ? state.missions.map((m) => (m.id === mission.id ? { ...m, completed: true } : m)) : state.missions,
    points: state.points + (mission ? mission.points : 0),
  };
}

export function createSplit(state: AppState, split: SplitRequest): AppState {
  return { ...state, splits: [split, ...state.splits] };
}

export function toggleShare(state: AppState, splitId: string, index: number): AppState {
  return {
    ...state,
    splits: state.splits.map((s) => (s.id === splitId ? { ...s, shares: s.shares.map((share, i) => (i === index ? { ...share, paid: !share.paid } : share)) } : s)),
  };
}

export function removeSplit(state: AppState, id: string): AppState {
  return { ...state, splits: state.splits.filter((s) => s.id !== id) };
}

export function createSupportTicket(state: AppState, ticket: SupportTicket): AppState {
  return { ...state, supportTickets: [ticket, ...state.supportTickets] };
}

export function answerSupportTickets(state: AppState): AppState {
  if (!state.supportTickets.some((t) => t.status === "deschis")) return state;
  return {
    ...state,
    supportTickets: state.supportTickets.map((t) =>
      t.status === "deschis"
        ? { ...t, status: "raspuns" as const, reply: "Am preluat solicitarea ta. Un coleg verifică acum plata și îți scrie aici, de obicei în mai puțin de două ore." }
        : t,
    ),
  };
}

export function snoozeReminder(state: AppState, eventId: string): AppState {
  return state.snoozed.includes(eventId) ? state : { ...state, snoozed: [...state.snoozed, eventId] };
}

export function markNotificationsRead(state: AppState, ids: string[]): AppState {
  const fresh = ids.filter((id) => !state.readNotifications.includes(id));
  return fresh.length ? { ...state, readNotifications: [...state.readNotifications, ...fresh] } : state;
}

export function finishOnboarding(state: AppState): AppState {
  return state.onboardingDone ? state : { ...state, onboardingDone: true };
}
