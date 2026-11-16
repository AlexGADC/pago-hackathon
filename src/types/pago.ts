// Contractul comun Frontend <-> Backend. Modificați doar de comun acord (pe main).

export type HouseId = "acasa" | "bunici";

export interface House {
  id: HouseId;
  name: string; // "Casa Noastră"
  emoji: string; // "🏠"
  address: string;
}

export type UtilityKind = "curent" | "gaz" | "apa" | "salubritate" | "telecom" | "intretinere";

/** Flux A = utilitate cu contor (index introdus manual). Flux B = fără contor (confirmare 1 tap). */
export type DisputeFlow = "A" | "B";

export type BillStatus =
  | "normala" // ✅ în media ultimelor 12 luni
  | "red_flag" // 🚨 anomalie detectată
  | "contestata" // sesizare trimisă, diferență înghețată
  | "platita_partial" // s-a plătit suma necontestată
  | "platita";

export interface MonthlyAmount {
  month: string; // "2026-01"
  amount: number; // RON
}

/** Date extrase de Pago din PDF-ul facturii (simulate). */
export interface MeterReading {
  unit: "kWh" | "m³";
  billedIndex: number; // indexul facturat (contestat), ex: 1485
  lastConfirmedIndex: number; // ultimul index real confirmat, ex: 5
  pricePerUnit: number; // RON / unitate
}

export interface Anomaly {
  reason: string; // explicația pe românește
  expectedAmount: number; // suma corectă estimată (ce se poate plăti acum)
  /** Flux B: liniile din PDF suspectate. */
  suspiciousLines?: string[];
}

export interface Bill {
  id: string;
  houseId: HouseId;
  provider: string; // "Electrica Furnizare"
  kind: UtilityKind;
  flow: DisputeFlow;
  invoiceNumber: string;
  clientCode: string;
  issueDate: string; // ISO
  dueDate: string; // ISO
  amount: number; // RON facturat
  averageAmount: number; // media pe 12 luni
  history: MonthlyAmount[]; // ultimele 12 luni
  status: BillStatus;
  meter?: MeterReading; // doar Flux A
  anomaly?: Anomaly; // doar dacă status === "red_flag"
}

export type TicketStage = "trimisa" | "in_analiza" | "stornata";

export type ConfidenceLabel = "Declarat manual de client (supus regularizării)" | "Confirmat de client (fără contor)";

export interface DisputeTicket {
  id: string;
  billId: string;
  houseId: HouseId;
  createdAt: string; // ISO
  stage: TicketStage;
  legalDeadlineDays: 15 | 30;
  confidence: ConfidenceLabel;
  realIndex?: number; // Flux A
  disputedAmount: number; // diferența înghețată
  paidAmount: number; // suma necontestată plătită
  message: string; // sesizarea către furnizor
}

export type MemberRole = "admin" | "junior" | "protejat";

export interface FamilyMember {
  id: string;
  name: string;
  role: MemberRole;
  avatar: string; // emoji
  points: number; // contribuția la Family Pool
}

export interface PoolGoal {
  target: number; // ex: 3000
  label: string; // "-50 RON la curent sau donație Salvați Copiii"
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

export interface Subscription {
  id: string;
  houseId: HouseId;
  name: string; // "Netflix"
  monthlyPrice: number;
  previousPrice?: number; // dacă s-a scumpit
  renewsOn: string; // ISO
  trialEndsOn?: string; // ISO, dacă e Free Trial
}

export type ExpiryKind = "RCA" | "Rovinietă" | "ITP";

export interface ExpiryItem {
  id: string;
  houseId: HouseId;
  kind: ExpiryKind;
  vehicle: string; // "Dacia Logan B-123-POP"
  expiresOn: string; // ISO
}

// ---------- Validare index (Flux A) ----------

export type IndexValidation =
  | { ok: true; consumption: number; correctAmount: number; disputedAmount: number }
  | { ok: false; error: string };
