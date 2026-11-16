import {
  autopayLog,
  autopayRules,
  bills,
  defaultSettings,
  expiries,
  familyMembers,
  houses,
  INITIAL_POINTS,
  missions,
  paymentMethods,
  splits,
  subscriptions,
  supplierConnections,
} from "@/data/mockFamilyData";
import type {
  AutopayLogEntry,
  AutopayRule,
  Bill,
  DisputeTicket,
  ExpiryItem,
  FamilyMember,
  House,
  HouseId,
  MeterSubmission,
  Mission,
  PaymentMethod,
  PaymentRecord,
  Settings,
  SplitRequest,
  Subscription,
  SupplierConnection,
  SupportTicket,
} from "@/types/pago";

export const STORAGE_KEY = "pago-home-family:v2";
export const STATE_VERSION = 4;

export interface AppState {
  version: number;
  onboardingDone: boolean;
  activeHouse: HouseId;
  houses: House[];
  points: number;
  bills: Bill[];
  tickets: DisputeTicket[];
  missions: Mission[];
  members: FamilyMember[];
  subscriptions: Subscription[];
  expiries: ExpiryItem[];
  payments: PaymentRecord[];
  connections: SupplierConnection[];
  methods: PaymentMethod[];
  autopay: AutopayRule[];
  autopayLog: AutopayLogEntry[];
  settings: Settings;
  readings: MeterSubmission[];
  splits: SplitRequest[];
  supportTickets: SupportTicket[];
  snoozed: string[];
  readNotifications: string[];
}

export function createInitialState(): AppState {
  return {
    version: STATE_VERSION,
    onboardingDone: false,
    activeHouse: houses[0].id,
    houses,
    points: INITIAL_POINTS,
    bills,
    tickets: [],
    missions,
    members: familyMembers,
    subscriptions,
    expiries,
    payments: [],
    connections: supplierConnections,
    methods: paymentMethods,
    autopay: autopayRules,
    autopayLog,
    settings: defaultSettings,
    readings: [],
    splits,
    supportTickets: [],
    snoozed: [],
    readNotifications: [],
  };
}

export function restoreState(raw: unknown): AppState {
  const initial = createInitialState();
  if (!raw || typeof raw !== "object") return initial;
  const saved = raw as Partial<AppState>;
  if (saved.version !== STATE_VERSION) return initial;
  const merged: AppState = { ...initial, ...saved, settings: { ...initial.settings, ...saved.settings, channels: { ...initial.settings.channels, ...saved.settings?.channels } } };
  if (!merged.houses.some((h) => h.id === merged.activeHouse)) merged.activeHouse = merged.houses[0]?.id ?? initial.activeHouse;
  return merged;
}
