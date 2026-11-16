export type HouseId = string;

export interface House {
  id: HouseId;
  name: string;
  emoji: string;
  address: string;
  avatar: string;
}

export type UtilityKind = "curent" | "gaz" | "apa" | "salubritate" | "telecom" | "intretinere";

export type DisputeFlow = "A" | "B";

export type BillStatus = "normala" | "red_flag" | "contestata" | "platita_partial" | "platita";

export interface MonthlyAmount {
  month: string;
  amount: number;
  issuedOn?: string;
}

export interface MeterReading {
  unit: "kWh" | "m³";
  billedIndex: number;
  lastConfirmedIndex: number;
  pricePerUnit: number;
}

export interface Anomaly {
  reason: string;
  expectedAmount: number;
  suspiciousLines?: string[];
}

export interface SelfReadingWindow {
  fromDay: number;
  toDay: number;
}

export interface Bill {
  id: string;
  houseId: HouseId;
  provider: string;
  kind: UtilityKind;
  flow: DisputeFlow;
  invoiceNumber: string;
  clientCode: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  averageAmount: number;
  history: MonthlyAmount[];
  status: BillStatus;
  meter?: MeterReading;
  anomaly?: Anomaly;
  selfReading?: SelfReadingWindow;
}

export type TicketStage = "trimisa" | "in_analiza" | "stornata";

export type ConfidenceLabel = "Declarat manual de client (supus regularizării)" | "Confirmat de client (fără contor)";

export interface DisputeTicket {
  id: string;
  billId: string;
  houseId: HouseId;
  createdAt: string;
  stage: TicketStage;
  legalDeadlineDays: 15 | 30;
  confidence: ConfidenceLabel;
  realIndex?: number;
  disputedAmount: number;
  paidAmount: number;
  message: string;
  resolvedAt?: string;
}

export type MemberRole = "admin" | "junior" | "protejat";

export interface FamilyMember {
  id: string;
  name: string;
  role: MemberRole;
  avatar: string;
  points: number;
  pending?: boolean;
}

export type MissionKind = "autocitire" | "eco_streak" | "bounty";

export interface Mission {
  id: string;
  kind: MissionKind;
  title: string;
  description: string;
  points: number;
  forRole: MemberRole | "toti";
  completed: boolean;
}

export type BillingCycle = "monthly" | "quarterly" | "yearly";

export type SubscriptionStatus = "activ" | "pauza" | "anulat";

export type SubscriptionCategory = "streaming" | "muzica" | "cloud" | "software" | "sport" | "tv" | "altele";

export interface Subscription {
  id: string;
  houseId: HouseId;
  name: string;
  price: number;
  cycle: BillingCycle;
  renewsOn: string;
  category: SubscriptionCategory;
  status: SubscriptionStatus;
  startedOn?: string;
  statusChangedOn?: string;
  previousPrice?: number;
  priceChangedOn?: string;
  trialEndsOn?: string;
  lastUsedDaysAgo?: number;
  sharedWith?: string[];
}

export type ExpiryKind = "RCA" | "Rovinietă" | "ITP" | "PAD";

export interface ExpiryItem {
  id: string;
  houseId: HouseId;
  kind: ExpiryKind;
  subject: string;
  expiresOn: string;
  price: number;
  provider?: string;
}

export type IndexValidation =
  | { ok: true; consumption: number; correctAmount: number; disputedAmount: number }
  | { ok: false; error: string };

export type PaymentCategory = "utilitati" | "abonamente" | "asigurari" | "servicii";

export type TargetKind = "bill" | "subscription" | "expiry" | "extra";

export type PaymentStatus = "procesare" | "trimisa" | "confirmata" | "esuata";

export interface RenewalPatch {
  expiresOn: string;
  price: number;
  provider?: string;
}

export interface PaymentRecord {
  id: string;
  eventId: string;
  targetId?: string;
  targetKind: TargetKind;
  houseId: HouseId;
  title: string;
  payee: string;
  category: PaymentCategory;
  amount: number;
  fee: number;
  discount: number;
  pointsUsed: number;
  pointsEarned: number;
  methodId: string;
  methodLabel: string;
  status: PaymentStatus;
  failureReason?: string;
  createdAt: string;
  reference: string;
  auto?: boolean;
  external?: boolean;
  batchId?: string;
  renew?: RenewalPatch;
}

export interface CheckoutItem {
  eventId: string;
  targetId?: string;
  targetKind: TargetKind;
  houseId: HouseId;
  title: string;
  subtitle?: string;
  amount: number;
  category: PaymentCategory;
  renew?: RenewalPatch;
}

export type ConnectionStatus = "conectat" | "sincronizare" | "deconectat";

export interface SupplierConnection {
  provider: string;
  houseId: HouseId;
  status: ConnectionStatus;
  lastSyncAt: string;
  problem?: string;
}

export type CardBrand = "visa" | "mastercard";

export interface PaymentMethod {
  id: string;
  brand: CardBrand;
  last4: string;
  holder: string;
  expMonth: number;
  expYear: number;
  label: string;
  isDefault: boolean;
}

export interface AutopayRule {
  targetId: string;
  targetKind: TargetKind;
  enabled: boolean;
  maxAmount: number;
  methodId: string;
  noticeDays: number;
  createdAt: string;
}

export type AutopayLogKind = "consent" | "paid" | "skipped";

export interface AutopayLogEntry {
  id: string;
  targetId: string;
  at: string;
  text: string;
  kind?: AutopayLogKind;
  eventId?: string;
}

export interface NotificationChannels {
  push: boolean;
  email: boolean;
  sms: boolean;
}

export interface Settings {
  reminderDays: number[];
  channels: NotificationChannels;
  appLock: boolean;
  monthlyBudget: number | null;
  monthlySummary: boolean;
}

export interface MeterSubmission {
  billId: string;
  index: number;
  submittedAt: string;
}

export interface SplitShare {
  name: string;
  memberId?: string;
  amount: number;
  paid: boolean;
}

export interface SplitRequest {
  id: string;
  houseId: HouseId;
  title: string;
  total: number;
  shares: SplitShare[];
  createdAt: string;
  link: string;
}

export type SupportStatus = "deschis" | "raspuns";

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  createdAt: string;
  status: SupportStatus;
  reply?: string;
}
