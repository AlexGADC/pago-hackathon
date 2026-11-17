import type { ProviderTemplate } from "@/data/catalog";
import { DEMO_TODAY } from "@/lib/disputes";
import type {
  CheckoutItem,
  DisputeTicket,
  ExpiryItem,
  FamilyMember,
  House,
  HouseId,
  PaymentMethod,
  Settings,
  SplitRequest,
  Subscription,
  SubscriptionStatus,
  SupportTicket,
  TargetKind,
} from "@/types/pago";
import * as actions from "./actions";
import type { AppState } from "./appState";

export interface CommandArgs {
  pay: { items: CheckoutItem[]; methodId: string; usePoints: boolean; now: string; stamp: number };
  payExternally: { item: CheckoutItem; now: string; stamp: number };
  submitDispute: { ticket: DisputeTicket; now: string; stamp: number };
  reconnect: { provider: string; houseId: HouseId };
  connectProvider: { template: ProviderTemplate; houseId: HouseId; clientCode: string; now: string; stamp: number };
  removeProvider: { provider: string; houseId: HouseId };
  addSubscription: { sub: Subscription };
  updateSubscription: { id: string; patch: Partial<Subscription> };
  setSubscriptionStatus: { id: string; status: SubscriptionStatus };
  removeSubscription: { id: string };
  addExpiry: { item: ExpiryItem };
  updateExpiry: { id: string; patch: Partial<ExpiryItem> };
  removeExpiry: { id: string };
  saveAutopay: { targetId: string; targetKind: TargetKind; maxAmount: number; methodId: string; noticeDays: number; name: string; now: string; stamp: number };
  disableAutopay: { targetId: string; name: string; now: string; stamp: number };
  addMethod: { method: PaymentMethod };
  removeMethod: { id: string };
  setDefaultMethod: { id: string };
  updateSettings: { patch: Partial<Settings> };
  addHouse: { house: House };
  setActiveHouse: { id: HouseId };
  inviteMember: { member: FamilyMember };
  removeMember: { id: string };
  completeMission: { id: string };
  submitReading: { billId: string; index: number; now: string };
  createSplit: { split: SplitRequest };
  toggleShare: { splitId: string; index: number };
  removeSplit: { id: string };
  createSupportTicket: { ticket: SupportTicket };
  snoozeReminder: { eventId: string };
  markNotificationsRead: { ids: string[] };
  finishOnboarding: Record<string, never>;
}

export type CommandType = keyof CommandArgs;

export type Command = { [K in CommandType]: { type: K; args: CommandArgs[K] } }[CommandType];

type Handlers = { [K in CommandType]: (state: AppState, args: CommandArgs[K]) => AppState };

const handlers: Handlers = {
  pay: (s, a) => actions.startPayments(s, a),
  payExternally: (s, a) => actions.markPaidExternally(s, a.item, a.now, a.stamp),
  submitDispute: (s, a) => actions.submitDispute(s, a.ticket, a.now, a.stamp),
  reconnect: (s, a) => actions.reconnect(s, a.provider, a.houseId),
  connectProvider: (s, a) => actions.connectProvider(s, a),
  removeProvider: (s, a) => actions.removeProvider(s, a.provider, a.houseId),
  addSubscription: (s, a) => actions.addSubscription(s, a.sub),
  updateSubscription: (s, a) => actions.updateSubscription(s, a.id, a.patch),
  setSubscriptionStatus: (s, a) => actions.setSubscriptionStatus(s, a.id, a.status, DEMO_TODAY),
  removeSubscription: (s, a) => actions.removeSubscription(s, a.id),
  addExpiry: (s, a) => actions.addExpiry(s, a.item),
  updateExpiry: (s, a) => actions.updateExpiry(s, a.id, a.patch),
  removeExpiry: (s, a) => actions.removeExpiry(s, a.id),
  saveAutopay: (s, a) => actions.saveAutopay(s, a),
  disableAutopay: (s, a) => actions.disableAutopay(s, a.targetId, a.name, a.now, a.stamp),
  addMethod: (s, a) => actions.addMethod(s, a.method),
  removeMethod: (s, a) => actions.removeMethod(s, a.id),
  setDefaultMethod: (s, a) => actions.setDefaultMethod(s, a.id),
  updateSettings: (s, a) => actions.updateSettings(s, a.patch),
  addHouse: (s, a) => actions.addHouse(s, a.house),
  setActiveHouse: (s, a) => actions.setActiveHouse(s, a.id),
  inviteMember: (s, a) => actions.inviteMember(s, a.member),
  removeMember: (s, a) => actions.removeMember(s, a.id),
  completeMission: (s, a) => actions.completeMission(s, a.id),
  submitReading: (s, a) => actions.submitReading(s, a.billId, a.index, a.now),
  createSplit: (s, a) => actions.createSplit(s, a.split),
  toggleShare: (s, a) => actions.toggleShare(s, a.splitId, a.index),
  removeSplit: (s, a) => actions.removeSplit(s, a.id),
  createSupportTicket: (s, a) => actions.createSupportTicket(s, a.ticket),
  snoozeReminder: (s, a) => actions.snoozeReminder(s, a.eventId),
  markNotificationsRead: (s, a) => actions.markNotificationsRead(s, a.ids),
  finishOnboarding: (s) => actions.finishOnboarding(s),
};

export const COMMAND_TYPES = Object.keys(handlers) as CommandType[];

export function isCommandType(value: unknown): value is CommandType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(handlers, value);
}

export function applyCommand(state: AppState, command: Command): AppState {
  const handler = handlers[command.type] as (state: AppState, args: Command["args"]) => AppState;
  return handler(state, command.args);
}

export type SystemStep = "payments" | "sync" | "tickets" | "storno" | "autopay" | "support";

export const STEP_DELAY_MS: Record<SystemStep, number> = {
  payments: 1300,
  sync: 1600,
  tickets: 3500,
  storno: 6000,
  autopay: 1200,
  support: 4000,
};

export const SYSTEM_STEPS = Object.keys(STEP_DELAY_MS) as SystemStep[];

export function stepIsDue(state: AppState, step: SystemStep, now: string): boolean {
  switch (step) {
    case "payments":
      return state.payments.some((p) => p.status === "procesare" || p.status === "trimisa");
    case "sync":
      return state.connections.some((c) => c.status === "sincronizare");
    case "tickets":
      return state.tickets.some((t) => t.stage === "trimisa");
    case "storno":
      return state.tickets.some((t) => t.stage === "in_analiza");
    case "support":
      return state.supportTickets.some((t) => t.status === "deschis");
    case "autopay":
      return state.onboardingDone && actions.runAutopay(state, now) !== state;
  }
}

export function applyStep(state: AppState, step: SystemStep, now: string): AppState {
  switch (step) {
    case "payments":
      return actions.advancePayments(state);
    case "sync":
      return actions.finishSync(state, now);
    case "tickets":
      return actions.advanceTickets(state);
    case "storno":
      return actions.resolveTickets(state, now);
    case "support":
      return actions.answerSupportTickets(state);
    case "autopay":
      return actions.runAutopay(state, now);
  }
}

export function hasPendingWork(state: AppState, now: string): boolean {
  return SYSTEM_STEPS.some((step) => stepIsDue(state, step, now));
}
