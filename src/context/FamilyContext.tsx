"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ProviderTemplate } from "@/data/catalog";
import { DEMO_TODAY } from "@/lib/disputes";
import { demoNow } from "@/lib/format";
import { buildNotifications, type AppNotification } from "@/lib/notifications";
import { buildEvents, type LedgerData, type PaymentEvent } from "@/lib/payments";
import type {
  Bill,
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
  SupplierConnection,
  TargetKind,
} from "@/types/pago";
import * as actions from "./actions";
import type { AppState } from "./appState";
import { store, subscribeNever } from "./store";

const PAYMENT_STEP_MS = 1300;
const SYNC_DELAY_MS = 1600;
const TICKET_DELAY_MS = 3500;
const SUPPORT_DELAY_MS = 4000;
const TOAST_MS = 2800;

export type ToastTone = "success" | "info" | "alert";

export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
}

export interface CheckoutRequest {
  items: CheckoutItem[];
  title?: string;
}

export interface AutopayDraft {
  targetId: string;
  targetKind: TargetKind;
  maxAmount: number;
  methodId: string;
  noticeDays: number;
  name: string;
}

const api = {
  pay(items: CheckoutItem[], methodId: string, usePoints: boolean): string[] {
    const stamp = Date.now();
    store.update((s) => actions.startPayments(s, { items, methodId, usePoints, now: demoNow(), stamp }));
    return items.map((_, index) => `pay-${stamp}-${index}`);
  },
  payExternally(item: CheckoutItem): void {
    store.update((s) => actions.markPaidExternally(s, item, demoNow(), Date.now()));
  },
  submitDispute(ticket: DisputeTicket): void {
    store.update((s) => actions.submitDispute(s, ticket, demoNow(), Date.now()));
  },
  reconnect(provider: string, houseId: HouseId): void {
    store.update((s) => actions.reconnect(s, provider, houseId));
  },
  connectProvider(template: ProviderTemplate, houseId: HouseId, clientCode: string): void {
    store.update((s) => actions.connectProvider(s, { template, houseId, clientCode, now: demoNow(), stamp: Date.now() }));
  },
  removeProvider(provider: string, houseId: HouseId): void {
    store.update((s) => actions.removeProvider(s, provider, houseId));
  },
  addSubscription(sub: Omit<Subscription, "id">): string {
    const id = `sub-${Date.now().toString(36)}`;
    store.update((s) => actions.addSubscription(s, { ...sub, id }));
    return id;
  },
  updateSubscription(id: string, patch: Partial<Subscription>): void {
    store.update((s) => actions.updateSubscription(s, id, patch));
  },
  setSubscriptionStatus(id: string, status: SubscriptionStatus): void {
    store.update((s) => actions.setSubscriptionStatus(s, id, status, DEMO_TODAY));
  },
  removeSubscription(id: string): void {
    store.update((s) => actions.removeSubscription(s, id));
  },
  addExpiry(item: Omit<ExpiryItem, "id">): string {
    const id = `exp-${Date.now().toString(36)}`;
    store.update((s) => actions.addExpiry(s, { ...item, id }));
    return id;
  },
  updateExpiry(id: string, patch: Partial<ExpiryItem>): void {
    store.update((s) => actions.updateExpiry(s, id, patch));
  },
  removeExpiry(id: string): void {
    store.update((s) => actions.removeExpiry(s, id));
  },
  saveAutopay(draft: AutopayDraft): void {
    store.update((s) => actions.saveAutopay(s, { ...draft, now: demoNow(), stamp: Date.now() }));
  },
  disableAutopay(targetId: string, name: string): void {
    store.update((s) => actions.disableAutopay(s, targetId, name, demoNow(), Date.now()));
  },
  addMethod(method: Omit<PaymentMethod, "id">): void {
    store.update((s) => actions.addMethod(s, { ...method, id: `pm-${Date.now().toString(36)}` }));
  },
  removeMethod(id: string): void {
    store.update((s) => actions.removeMethod(s, id));
  },
  setDefaultMethod(id: string): void {
    store.update((s) => actions.setDefaultMethod(s, id));
  },
  updateSettings(patch: Partial<Settings>): void {
    store.update((s) => actions.updateSettings(s, patch));
  },
  addHouse(house: Omit<House, "id">): void {
    store.update((s) => actions.addHouse(s, { ...house, id: `casa-${Date.now().toString(36)}` }));
  },
  setActiveHouse(id: HouseId): void {
    store.update((s) => actions.setActiveHouse(s, id));
  },
  inviteMember(member: Omit<FamilyMember, "id" | "points" | "pending">): void {
    store.update((s) => actions.inviteMember(s, { ...member, id: `m-${Date.now().toString(36)}`, points: 0, pending: true }));
  },
  removeMember(id: string): void {
    store.update((s) => actions.removeMember(s, id));
  },
  completeMission(id: string): void {
    store.update((s) => actions.completeMission(s, id));
  },
  submitReading(billId: string, index: number): void {
    store.update((s) => actions.submitReading(s, billId, index, demoNow()));
  },
  createSplit(split: Omit<SplitRequest, "id" | "createdAt" | "link">): SplitRequest {
    const code = Date.now().toString(36);
    const created: SplitRequest = { ...split, id: `split-${code}`, createdAt: demoNow(), link: `https://pago.ro/s/${code}` };
    store.update((s) => actions.createSplit(s, created));
    return created;
  },
  toggleShare(splitId: string, index: number): void {
    store.update((s) => actions.toggleShare(s, splitId, index));
  },
  removeSplit(id: string): void {
    store.update((s) => actions.removeSplit(s, id));
  },
  createSupportTicket(subject: string, message: string): void {
    store.update((s) => actions.createSupportTicket(s, { id: `tkt-${Date.now().toString(36)}`, subject, message, createdAt: demoNow(), status: "deschis" }));
  },
  snoozeReminder(eventId: string): void {
    store.update((s) => actions.snoozeReminder(s, eventId));
  },
  markNotificationsRead(ids: string[]): void {
    store.update((s) => actions.markNotificationsRead(s, ids));
  },
  finishOnboarding(): void {
    store.update(actions.finishOnboarding);
  },
};

type Api = typeof api;

interface FamilyContextValue extends AppState, Api {
  hydrated: boolean;
  today: string;
  house: House;
  houseBills: Bill[];
  houseSubscriptions: Subscription[];
  houseExpiries: ExpiryItem[];
  houseConnections: SupplierConnection[];
  ledger: LedgerData;
  yearEvents: PaymentEvent[];
  notifications: AppNotification[];
  unreadCount: number;
  defaultMethod: PaymentMethod | undefined;
  checkout: CheckoutRequest | null;
  toasts: Toast[];
  openCheckout: (items: CheckoutItem[], title?: string) => void;
  closeCheckout: () => void;
  toast: (text: string, tone?: ToastTone) => void;
  resetDemo: () => void;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

const TODAY_YEAR = Number(DEMO_TODAY.slice(0, 4));

export function FamilyProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const [checkout, setCheckout] = useState<CheckoutRequest | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!state.payments.some((p) => p.status === "procesare" || p.status === "trimisa")) return;
    const timer = setTimeout(() => store.update(actions.advancePayments), PAYMENT_STEP_MS);
    return () => clearTimeout(timer);
  }, [state.payments]);

  useEffect(() => {
    if (!state.connections.some((c) => c.status === "sincronizare")) return;
    const timer = setTimeout(() => store.update((s) => actions.finishSync(s, demoNow())), SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.connections]);

  useEffect(() => {
    if (!state.tickets.some((t) => t.stage === "trimisa")) return;
    const timer = setTimeout(() => store.update(actions.advanceTickets), TICKET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.tickets]);

  useEffect(() => {
    if (!state.supportTickets.some((t) => t.status === "deschis")) return;
    const timer = setTimeout(() => store.update(actions.answerSupportTickets), SUPPORT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.supportTickets]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => setToasts((list) => list.slice(1)), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toasts]);

  const house = state.houses.find((h) => h.id === state.activeHouse) ?? state.houses[0];
  const ledger: LedgerData = {
    bills: state.bills,
    subscriptions: state.subscriptions,
    expiries: state.expiries,
    payments: state.payments,
    tickets: state.tickets,
    autopay: state.autopay,
  };
  const yearEvents = buildEvents(ledger, house.id, TODAY_YEAR);
  const notifications = buildNotifications({
    houseId: house.id,
    events: yearEvents,
    bills: state.bills,
    subscriptions: state.subscriptions,
    expiries: state.expiries,
    connections: state.connections,
    payments: state.payments,
    tickets: state.tickets,
    readings: state.readings,
    settings: state.settings,
  });

  const value: FamilyContextValue = {
    ...state,
    ...api,
    hydrated,
    today: DEMO_TODAY,
    house,
    houseBills: state.bills.filter((b) => b.houseId === house.id),
    houseSubscriptions: state.subscriptions.filter((s) => s.houseId === house.id),
    houseExpiries: state.expiries.filter((e) => e.houseId === house.id),
    houseConnections: state.connections.filter((c) => c.houseId === house.id),
    ledger,
    yearEvents,
    notifications,
    unreadCount: notifications.filter((n) => !state.readNotifications.includes(n.id)).length,
    defaultMethod: state.methods.find((m) => m.isDefault) ?? state.methods[0],
    checkout,
    toasts,
    openCheckout: (items, title) => setCheckout(items.length ? { items, title } : null),
    closeCheckout: () => setCheckout(null),
    toast: (text, tone = "success") => setToasts((list) => [...list.slice(-2), { id: Date.now(), text, tone }]),
    resetDemo: () => {
      store.reset();
      setCheckout(null);
      setToasts([]);
    },
  };

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamily() trebuie folosit în interiorul <FamilyProvider>.");
  return ctx;
}
