// Date simulate: ce ar sincroniza Pago din conturile de furnizori ale Familiei Popescu.
// Backend-ul și Frontend-ul citesc AMBELE de aici. Adăugați la final, nu rescrieți.

import type { Bill, ExpiryItem, FamilyMember, House, Mission, MonthlyAmount, PoolGoal, Subscription } from "@/types/pago";

export const FAMILY_NAME = "Familia Popescu";

export const houses: House[] = [
  { id: "acasa", name: "Casa Noastră", emoji: "🏠", address: "Str. Lalelelor 12, Cluj-Napoca" },
  { id: "bunici", name: "Casa Bunicilor", emoji: "👵", address: "Str. Morii 4, Turda" },
];

function history(base: number, jitter: number[]): MonthlyAmount[] {
  const months = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
  return months.map((month, i) => ({ month, amount: Math.round(base + (jitter[i] ?? 0)) }));
}

export const bills: Bill[] = [
  // ---- Casa Noastră ----
  {
    id: "bill-electrica",
    houseId: "acasa",
    provider: "Electrica Furnizare",
    kind: "curent",
    flow: "A",
    invoiceNumber: "EFS-2026-1183427",
    clientCode: "5001234567",
    issueDate: "2026-11-05",
    dueDate: "2026-11-25",
    amount: 1480,
    averageAmount: 260,
    history: history(260, [30, 45, 40, 20, -10, -25, -30, -20, -15, -5, 5, 15]),
    status: "red_flag",
    meter: { unit: "kWh", billedIndex: 1485, lastConfirmedIndex: 5, pricePerUnit: 1 },
    anomaly: {
      reason: "Ți-au facturat 1.480 kWh într-o lună: indexul estimat este 1.485 kWh, deși ultimul index real confirmat a fost 5 kWh. Contorul arată de fapt 15,79 kWh.",
      expectedAmount: 11,
    },
  },
  {
    id: "bill-gaz",
    houseId: "acasa",
    provider: "E.ON Energie",
    kind: "gaz",
    flow: "A",
    invoiceNumber: "EON-88213409",
    clientCode: "GZ-77120345",
    issueDate: "2026-11-03",
    dueDate: "2026-11-23",
    amount: 182,
    averageAmount: 175,
    history: history(175, [60, 80, 90, 70, 20, -60, -90, -100, -100, -90, -40, 10]),
    status: "normala",
    meter: { unit: "m³", billedIndex: 4321, lastConfirmedIndex: 4250, pricePerUnit: 2.56 },
  },
  {
    id: "bill-digi",
    houseId: "acasa",
    provider: "Digi România",
    kind: "telecom",
    flow: "B",
    invoiceNumber: "DIGI-55102938",
    clientCode: "RCS-1029384",
    issueDate: "2026-11-01",
    dueDate: "2026-11-20",
    amount: 62,
    averageAmount: 62,
    history: history(62, []),
    status: "normala",
  },
  // ---- Casa Bunicilor ----
  {
    id: "bill-retim",
    houseId: "bunici",
    provider: "Retim Salubritate",
    kind: "salubritate",
    flow: "B",
    invoiceNumber: "RTM-2026-004512",
    clientCode: "TM-998877",
    issueDate: "2026-11-04",
    dueDate: "2026-11-30",
    amount: 110,
    averageAmount: 45,
    history: history(45, []),
    status: "red_flag",
    anomaly: {
      reason: "Pe factură apar 5 persoane, dar în casă locuiesc doar 2. Abonamentul obișnuit e 45 RON.",
      expectedAmount: 45,
      suspiciousLines: ["Nr. persoane declarate: 5", "Tarif: 22 RON / persoană / lună"],
    },
  },
  {
    id: "bill-apa-bunici",
    houseId: "bunici",
    provider: "Compania de Apă Arieș",
    kind: "apa",
    flow: "A",
    invoiceNumber: "CAA-3341200",
    clientCode: "AP-551203",
    issueDate: "2026-11-02",
    dueDate: "2026-11-22",
    amount: 58,
    averageAmount: 55,
    history: history(55, [3, -2, 4, 1, -3, 2, 5, 6, 2, -1, 0, 3]),
    status: "normala",
    meter: { unit: "m³", billedIndex: 812, lastConfirmedIndex: 803, pricePerUnit: 6.4 },
  },
];

export const familyMembers: FamilyMember[] = [
  { id: "m-alex", name: "Alexandru", role: "admin", avatar: "👨", points: 1200 },
  { id: "m-ioana", name: "Ioana", role: "admin", avatar: "👩", points: 850 },
  { id: "m-matei", name: "Matei (14)", role: "junior", avatar: "🧒", points: 400 },
  { id: "m-bunica", name: "Bunica Maria", role: "protejat", avatar: "👵", points: 0 },
];

export const INITIAL_POINTS = 2450;

export const poolGoal: PoolGoal = {
  target: 3000,
  label: "-50 RON la factura de curent sau donație către Salvați Copiii",
};

export const POINTS = {
  autocitire: 150,
  ecoStreak: 200,
  bounty: 500,
} as const;

export const missions: Mission[] = [
  {
    id: "mis-autocitire",
    kind: "autocitire",
    title: "📸 Misiunea Autocitire",
    description: "Introdu indexul contorului de curent în fereastra de autocitire (1–5 ale lunii).",
    points: POINTS.autocitire,
    forRole: "junior",
    completed: false,
  },
  {
    id: "mis-eco",
    kind: "eco_streak",
    title: "🌱 Eco-Streak",
    description: "Consumă mai puțin curent decât luna trecută.",
    points: POINTS.ecoStreak,
    forRole: "toti",
    completed: false,
  },
  {
    id: "mis-bounty",
    kind: "bounty",
    title: "🛡️ Bounty Hunter",
    description: "Prinde și contestă o factură greșită.",
    points: POINTS.bounty,
    forRole: "toti",
    completed: false,
  },
];

export const subscriptions: Subscription[] = [
  { id: "sub-netflix", houseId: "acasa", name: "Netflix", monthlyPrice: 59.99, previousPrice: 49.99, renewsOn: "2026-11-21" },
  { id: "sub-spotify", houseId: "acasa", name: "Spotify Family", monthlyPrice: 39.99, renewsOn: "2026-11-28" },
  { id: "sub-icloud", houseId: "acasa", name: "iCloud 200 GB", monthlyPrice: 14.99, renewsOn: "2026-12-02", trialEndsOn: "2026-11-19" },
  { id: "sub-sala", houseId: "acasa", name: "Sală 18GYM", monthlyPrice: 149, renewsOn: "2026-12-01" },
  { id: "sub-tv-bunici", houseId: "bunici", name: "Digi TV", monthlyPrice: 35, renewsOn: "2026-11-25" },
  { id: "sub-disney", houseId: "acasa", name: "Disney+", monthlyPrice: 34.99, renewsOn: "2026-11-27" },
];

export const expiries: ExpiryItem[] = [
  { id: "exp-rca-logan", houseId: "acasa", kind: "RCA", vehicle: "Dacia Logan · CJ-12-POP", expiresOn: "2026-11-29" },
  { id: "exp-rov-logan", houseId: "acasa", kind: "Rovinietă", vehicle: "Dacia Logan · CJ-12-POP", expiresOn: "2027-01-14" },
  { id: "exp-itp-logan", houseId: "acasa", kind: "ITP", vehicle: "Dacia Logan · CJ-12-POP", expiresOn: "2027-04-02" },
  { id: "exp-rca-bunici", houseId: "bunici", kind: "RCA", vehicle: "Renault Clio · CJ-55-MRA", expiresOn: "2026-11-24" },
];
