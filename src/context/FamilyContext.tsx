"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ProviderTemplate } from "@/data/catalog";
import { DEMO_TODAY, fmtRon } from "@/lib/disputes";
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
import { hasPendingWork } from "./commands";
import type { AppState } from "./appState";
import { session, useSession } from "./session";
import { store, subscribeNever } from "./store";

const PAYMENT_STEP_MS = 1300;
const SYNC_DELAY_MS = 1600;
const TICKET_DELAY_MS = 3500;
const STORNO_DELAY_MS = 6000;
const AUTOPAY_DELAY_MS = 1200;
const SUPPORT_DELAY_MS = 4000;
const POLL_MS = 1500;
const IDLE_POLLS = 10;
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

const stamp = () => Date.now();
const code = () => Date.now().toString(36);

const api = {
  pay(items: CheckoutItem[], methodId: string, usePoints: boolean): string[] {
    const at = stamp();
    store.dispatch({ type: "pay", args: { items, methodId, usePoints, now: demoNow(), stamp: at } });
    return items.map((_, index) => `pay-${at}-${index}`);
  },
  payExternally(item: CheckoutItem): void {
    store.dispatch({ type: "payExternally", args: { item, now: demoNow(), stamp: stamp() } });
  },
  submitDispute(ticket: DisputeTicket): void {
    store.dispatch({ type: "submitDispute", args: { ticket, now: demoNow(), stamp: stamp() } });
  },
  reconnect(provider: string, houseId: HouseId): void {
    store.dispatch({ type: "reconnect", args: { provider, houseId } });
  },
  connectProvider(template: ProviderTemplate, houseId: HouseId, clientCode: string): void {
    store.dispatch({ type: "connectProvider", args: { template, houseId, clientCode, now: demoNow(), stamp: stamp() } });
  },
  removeProvider(provider: string, houseId: HouseId): void {
    store.dispatch({ type: "removeProvider", args: { provider, houseId } });
  },
  addSubscription(sub: Omit<Subscription, "id">): string {
    const id = `sub-${code()}`;
    store.dispatch({ type: "addSubscription", args: { sub: { ...sub, id } } });
    return id;
  },
  updateSubscription(id: string, patch: Partial<Subscription>): void {
    store.dispatch({ type: "updateSubscription", args: { id, patch } });
  },
  setSubscriptionStatus(id: string, status: SubscriptionStatus): void {
    store.dispatch({ type: "setSubscriptionStatus", args: { id, status } });
  },
  removeSubscription(id: string): void {
    store.dispatch({ type: "removeSubscription", args: { id } });
  },
  addExpiry(item: Omit<ExpiryItem, "id">): string {
    const id = `exp-${code()}`;
    store.dispatch({ type: "addExpiry", args: { item: { ...item, id } } });
    return id;
  },
  updateExpiry(id: string, patch: Partial<ExpiryItem>): void {
    store.dispatch({ type: "updateExpiry", args: { id, patch } });
  },
  removeExpiry(id: string): void {
    store.dispatch({ type: "removeExpiry", args: { id } });
  },
  saveAutopay(draft: AutopayDraft): void {
    store.dispatch({ type: "saveAutopay", args: { ...draft, now: demoNow(), stamp: stamp() } });
  },
  disableAutopay(targetId: string, name: string): void {
    store.dispatch({ type: "disableAutopay", args: { targetId, name, now: demoNow(), stamp: stamp() } });
  },
  addMethod(method: Omit<PaymentMethod, "id">): void {
    store.dispatch({ type: "addMethod", args: { method: { ...method, id: `pm-${code()}` } } });
  },
  removeMethod(id: string): void {
    store.dispatch({ type: "removeMethod", args: { id } });
  },
  setDefaultMethod(id: string): void {
    store.dispatch({ type: "setDefaultMethod", args: { id } });
  },
  updateSettings(patch: Partial<Settings>): void {
    store.dispatch({ type: "updateSettings", args: { patch } });
  },
  addHouse(house: Omit<House, "id">): void {
    store.dispatch({ type: "addHouse", args: { house: { ...house, id: `casa-${code()}` } } });
  },
  setActiveHouse(id: HouseId): void {
    store.dispatch({ type: "setActiveHouse", args: { id } });
  },
  inviteMember(member: Omit<FamilyMember, "id" | "points" | "pending">): void {
    store.dispatch({ type: "inviteMember", args: { member: { ...member, id: `m-${code()}`, points: 0, pending: true } } });
  },
  removeMember(id: string): void {
    store.dispatch({ type: "removeMember", args: { id } });
  },
  completeMission(id: string): void {
    store.dispatch({ type: "completeMission", args: { id } });
  },
  submitReading(billId: string, index: number): void {
    store.dispatch({ type: "submitReading", args: { billId, index, now: demoNow() } });
  },
  createSplit(split: Omit<SplitRequest, "id" | "createdAt" | "link">): SplitRequest {
    const key = code();
    const created: SplitRequest = { ...split, id: `split-${key}`, createdAt: demoNow(), link: `https://pago.ro/s/${key}` };
    store.dispatch({ type: "createSplit", args: { split: created } });
    return created;
  },
  toggleShare(splitId: string, index: number): void {
    store.dispatch({ type: "toggleShare", args: { splitId, index } });
  },
  removeSplit(id: string): void {
    store.dispatch({ type: "removeSplit", args: { id } });
  },
  createSupportTicket(subject: string, message: string): void {
    store.dispatch({ type: "createSupportTicket", args: { ticket: { id: `tkt-${code()}`, subject, message, createdAt: demoNow(), status: "deschis" } } });
  },
  snoozeReminder(eventId: string): void {
    store.dispatch({ type: "snoozeReminder", args: { eventId } });
  },
  markNotificationsRead(ids: string[]): void {
    store.dispatch({ type: "markNotificationsRead", args: { ids } });
  },
  finishOnboarding(): void {
    store.dispatch({ type: "finishOnboarding", args: {} });
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
  const { status } = useSession();
  const local = status !== "user";

  useEffect(() => {
    void session.start();
  }, []);

  useEffect(() => {
    if (status !== "user") return;
    let idle = 0;
    const tick = () => {
      idle += 1;
      if (hasPendingWork(store.getSnapshot(), demoNow()) || idle >= IDLE_POLLS) {
        idle = 0;
        store.refresh();
      }
    };
    const timer = setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") store.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status]);

  useEffect(() => {
    const push = (items: { text: string; tone: ToastTone }[]) => {
      if (items.length === 0) return;
      const at = Date.now();
      setToasts((list) => [...list, ...items.map((item, index) => ({ id: at + index, ...item }))].slice(-3));
    };
    const offChange = store.onRemoteChange((previous, next) => {
      const closed = next.tickets.filter((t) => t.stage === "stornata" && previous.tickets.some((p) => p.id === t.id && p.stage !== "stornata"));
      const known = new Set(previous.payments.map((p) => p.id));
      const started = next.payments.filter((p) => p.auto && !known.has(p.id));
      push([
        ...closed.map((t) => ({ text: `Factură stornată: ai economisit ${fmtRon(t.disputedAmount)}`, tone: "success" as const })),
        ...started.map((p) => ({ text: `Plată automată: ${p.title} · ${fmtRon(p.amount)}`, tone: "info" as const })),
      ]);
    });
    const offProblem = store.onProblem((message) => push([{ text: message, tone: "alert" }]));
    return () => {
      offChange();
      offProblem();
    };
  }, []);

  useEffect(() => {
    if (!local || !state.payments.some((p) => p.status === "procesare" || p.status === "trimisa")) return;
    const timer = setTimeout(() => store.update(actions.advancePayments), PAYMENT_STEP_MS);
    return () => clearTimeout(timer);
  }, [state.payments, local]);

  useEffect(() => {
    if (!local || !state.connections.some((c) => c.status === "sincronizare")) return;
    const timer = setTimeout(() => store.update((s) => actions.finishSync(s, demoNow())), SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.connections, local]);

  useEffect(() => {
    if (!local || !state.tickets.some((t) => t.stage === "trimisa")) return;
    const timer = setTimeout(() => store.update(actions.advanceTickets), TICKET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.tickets, local]);

  useEffect(() => {
    if (!local || !state.tickets.some((t) => t.stage === "in_analiza")) return;
    const timer = setTimeout(() => {
      const closing = store.getSnapshot().tickets.filter((t) => t.stage === "in_analiza");
      store.update((s) => actions.resolveTickets(s, demoNow()));
      const stamp = Date.now();
      setToasts((list) => [
        ...list,
        ...closing.map((t, index) => ({ id: stamp + index, text: `Factură stornată: ai economisit ${fmtRon(t.disputedAmount)}`, tone: "success" as const })),
      ].slice(-3));
    }, STORNO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.tickets, local]);

  useEffect(() => {
    if (!local || status === "loading" || !state.onboardingDone) return;
    const timer = setTimeout(() => {
      const before = store.getSnapshot().payments.length;
      store.update((s) => actions.runAutopay(s, demoNow()));
      const started = store.getSnapshot().payments.slice(before).filter((p) => p.auto);
      if (started.length === 0) return;
      const stamp = Date.now();
      setToasts((list) => [...list, ...started.map((p, index) => ({ id: stamp + index, text: `Plată automată: ${p.title} · ${fmtRon(p.amount)}`, tone: "info" as const }))].slice(-3));
    }, AUTOPAY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.autopay, state.onboardingDone, local, status]);

  useEffect(() => {
    if (!local || !state.supportTickets.some((t) => t.status === "deschis")) return;
    const timer = setTimeout(() => store.update(actions.answerSupportTickets), SUPPORT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.supportTickets, local]);

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
    autopayLog: state.autopayLog,
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
      void store.reset();
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
