import type {
  AutopayLogEntry,
  AutopayRule,
  Bill,
  ExpiryItem,
  FamilyMember,
  House,
  Mission,
  MonthlyAmount,
  PaymentMethod,
  Settings,
  SplitRequest,
  Subscription,
  SupplierConnection,
} from "@/types/pago";

export const FAMILY_NAME = "Familia Popescu";

export const houses: House[] = [
  { id: "acasa", name: "Casa Noastră", emoji: "🏠", address: "Str. Lalelelor 12, Cluj-Napoca", avatar: "/avatars/acasa.svg" },
  { id: "bunici", name: "Casa Bunicilor", emoji: "👵", address: "Str. Morii 4, Turda", avatar: "/avatars/bunici.svg" },
];

export const AVATAR_CHOICES = ["/avatars/acasa.svg", "/avatars/bunici.svg", "/avatars/vacanta.svg", "/avatars/birou.svg", "/avatars/garsoniera.svg"];

const HISTORY_MONTHS = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

export function monthlyHistory(base: number, jitter: number[] = []): MonthlyAmount[] {
  return HISTORY_MONTHS.map((month, i) => ({ month, amount: Math.round(base + (jitter[i] ?? 0)) }));
}

export const bills: Bill[] = [
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
    history: monthlyHistory(260, [30, 45, 40, 20, -10, -25, -30, -20, -15, -5, 5, 15]),
    status: "red_flag",
    meter: { unit: "kWh", billedIndex: 1485, lastConfirmedIndex: 5, pricePerUnit: 1 },
    anomaly: {
      reason: "Ți-au facturat 1.480 kWh într-o lună: indexul estimat este 1.485 kWh, deși ultimul index real confirmat a fost 5 kWh. Contorul arată de fapt 15,79 kWh.",
      expectedAmount: 11,
    },
    selfReading: { fromDay: 1, toDay: 5 },
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
    history: monthlyHistory(175, [60, 80, 90, 70, 20, -60, -90, -100, -100, -90, -40, 10]),
    status: "normala",
    meter: { unit: "m³", billedIndex: 4321, lastConfirmedIndex: 4250, pricePerUnit: 2.56 },
    selfReading: { fromDay: 15, toDay: 20 },
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
    history: monthlyHistory(62),
    status: "normala",
  },
  {
    id: "bill-intretinere",
    houseId: "acasa",
    provider: "Asociația de proprietari M4",
    kind: "intretinere",
    flow: "B",
    invoiceNumber: "AP-M4-2026-10",
    clientCode: "AP-12",
    issueDate: "2026-10-28",
    dueDate: "2026-11-10",
    amount: 320,
    averageAmount: 305,
    history: monthlyHistory(305, [40, 55, 60, 45, 10, -20, -35, -40, -40, -30, -5, 20]),
    status: "normala",
  },
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
    history: monthlyHistory(45),
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
    history: monthlyHistory(55, [3, -2, 4, 1, -3, 2, 5, 6, 2, -1, 0, 3]),
    status: "normala",
    meter: { unit: "m³", billedIndex: 812, lastConfirmedIndex: 803, pricePerUnit: 6.4 },
    selfReading: { fromDay: 20, toDay: 25 },
  },
];

export const familyMembers: FamilyMember[] = [
  { id: "m-alex", name: "Alexandru", role: "admin", avatar: "👨", points: 1200 },
  { id: "m-ioana", name: "Ioana", role: "admin", avatar: "👩", points: 850 },
  { id: "m-matei", name: "Matei (14)", role: "junior", avatar: "🧒", points: 400 },
  { id: "m-bunica", name: "Bunica Maria", role: "protejat", avatar: "👵", points: 0 },
];

export const CURRENT_MEMBER_ID = "m-alex";

export const INITIAL_POINTS = 2450;

export const POINTS = {
  autocitire: 150,
  ecoStreak: 200,
  bounty: 500,
} as const;

export const missions: Mission[] = [
  {
    id: "mis-autocitire",
    kind: "autocitire",
    title: "Misiunea Autocitire",
    description: "Transmite indexul unui contor în fereastra de autocitire a furnizorului.",
    points: POINTS.autocitire,
    forRole: "junior",
    completed: false,
  },
  {
    id: "mis-eco",
    kind: "eco_streak",
    title: "Eco-Streak",
    description: "Consumă mai puțin curent decât luna trecută.",
    points: POINTS.ecoStreak,
    forRole: "toti",
    completed: false,
  },
  {
    id: "mis-bounty",
    kind: "bounty",
    title: "Bounty Hunter",
    description: "Prinde și contestă o factură greșită.",
    points: POINTS.bounty,
    forRole: "toti",
    completed: false,
  },
];

export const subscriptions: Subscription[] = [
  {
    id: "sub-netflix",
    houseId: "acasa",
    name: "Netflix",
    price: 59.99,
    cycle: "monthly",
    renewsOn: "2026-11-21",
    category: "streaming",
    status: "activ",
    previousPrice: 49.99,
    priceChangedOn: "2026-11-01",
    lastUsedDaysAgo: 1,
    sharedWith: ["m-alex", "m-ioana", "m-matei"],
  },
  {
    id: "sub-spotify",
    houseId: "acasa",
    name: "Spotify Family",
    price: 39.99,
    cycle: "monthly",
    renewsOn: "2026-11-28",
    category: "muzica",
    status: "activ",
    lastUsedDaysAgo: 0,
    sharedWith: ["m-alex", "m-ioana", "m-matei"],
  },
  {
    id: "sub-icloud",
    houseId: "acasa",
    name: "iCloud 200 GB",
    price: 14.99,
    cycle: "monthly",
    renewsOn: "2026-11-19",
    category: "cloud",
    status: "activ",
    startedOn: "2026-11-19",
    trialEndsOn: "2026-11-19",
    lastUsedDaysAgo: 0,
  },
  {
    id: "sub-sala",
    houseId: "acasa",
    name: "Sală 18GYM",
    price: 149,
    cycle: "monthly",
    renewsOn: "2026-12-01",
    category: "sport",
    status: "pauza",
    statusChangedOn: "2026-11-05",
    lastUsedDaysAgo: 38,
  },
  {
    id: "sub-tv-bunici",
    houseId: "bunici",
    name: "Digi TV",
    price: 35,
    cycle: "monthly",
    renewsOn: "2026-11-25",
    category: "tv",
    status: "activ",
    lastUsedDaysAgo: 0,
  },
  {
    id: "sub-disney",
    houseId: "acasa",
    name: "Disney+",
    price: 34.99,
    cycle: "monthly",
    renewsOn: "2026-11-25",
    category: "streaming",
    status: "activ",
    lastUsedDaysAgo: 74,
  },
  {
    id: "sub-dropbox",
    houseId: "acasa",
    name: "Dropbox",
    price: 39,
    cycle: "monthly",
    renewsOn: "2026-11-09",
    category: "cloud",
    status: "activ",
    lastUsedDaysAgo: 3,
  },
  {
    id: "sub-chatgpt",
    houseId: "acasa",
    name: "ChatGPT Plus",
    price: 1200,
    cycle: "yearly",
    renewsOn: "2026-04-05",
    category: "software",
    status: "activ",
    lastUsedDaysAgo: 0,
  },
  {
    id: "sub-amazon",
    houseId: "acasa",
    name: "Amazon Prime",
    price: 180,
    cycle: "yearly",
    renewsOn: "2026-09-14",
    category: "streaming",
    status: "activ",
    lastUsedDaysAgo: 12,
  },
  {
    id: "sub-antivirus",
    houseId: "acasa",
    name: "Bitdefender",
    price: 89.99,
    cycle: "quarterly",
    renewsOn: "2026-12-15",
    category: "software",
    status: "activ",
    lastUsedDaysAgo: 0,
  },
  {
    id: "sub-hbo",
    houseId: "acasa",
    name: "HBO Max",
    price: 29.99,
    cycle: "monthly",
    renewsOn: "2026-10-12",
    category: "streaming",
    status: "anulat",
    statusChangedOn: "2026-10-20",
    lastUsedDaysAgo: 90,
  },
];

export const expiries: ExpiryItem[] = [
  { id: "exp-rca-logan", houseId: "acasa", kind: "RCA", subject: "Dacia Logan · CJ-12-POP", expiresOn: "2026-11-29", price: 1150, provider: "Groupama" },
  { id: "exp-rov-logan", houseId: "acasa", kind: "Rovinietă", subject: "Dacia Logan · CJ-12-POP", expiresOn: "2027-01-14", price: 130 },
  { id: "exp-itp-logan", houseId: "acasa", kind: "ITP", subject: "Dacia Logan · CJ-12-POP", expiresOn: "2027-04-02", price: 140 },
  { id: "exp-pad-acasa", houseId: "acasa", kind: "PAD", subject: "Apartament · Str. Lalelelor 12", expiresOn: "2027-02-20", price: 130, provider: "PAID" },
  { id: "exp-rca-bunici", houseId: "bunici", kind: "RCA", subject: "Renault Clio · CJ-55-MRA", expiresOn: "2026-11-24", price: 980, provider: "Omniasig" },
];

export const supplierConnections: SupplierConnection[] = [
  { provider: "Electrica Furnizare", houseId: "acasa", status: "conectat", lastSyncAt: "2026-11-15T08:00:00" },
  {
    provider: "E.ON Energie",
    houseId: "acasa",
    status: "deconectat",
    lastSyncAt: "2026-11-10T08:00:00",
    problem: "Autentificarea a expirat. Reconectează contul ca să vezi facturile noi.",
  },
  { provider: "Digi România", houseId: "acasa", status: "conectat", lastSyncAt: "2026-11-15T08:00:00" },
  { provider: "Asociația de proprietari M4", houseId: "acasa", status: "conectat", lastSyncAt: "2026-11-12T08:00:00" },
  { provider: "Retim Salubritate", houseId: "bunici", status: "conectat", lastSyncAt: "2026-11-14T08:00:00" },
  { provider: "Compania de Apă Arieș", houseId: "bunici", status: "conectat", lastSyncAt: "2026-11-15T08:00:00" },
];

export const paymentMethods: PaymentMethod[] = [
  { id: "pm-visa", brand: "visa", last4: "4821", holder: "Alexandru Popescu", expMonth: 8, expYear: 2028, label: "Card salariu", isDefault: true },
  { id: "pm-mc", brand: "mastercard", last4: "1093", holder: "Alexandru Popescu", expMonth: 10, expYear: 2026, label: "Card vechi", isDefault: false },
];

export const autopayRules: AutopayRule[] = [
  { targetId: "bill-digi", targetKind: "bill", enabled: true, maxAmount: 100, methodId: "pm-visa", noticeDays: 3, createdAt: "2026-09-01T10:00:00" },
  { targetId: "sub-netflix", targetKind: "subscription", enabled: true, maxAmount: 80, methodId: "pm-visa", noticeDays: 3, createdAt: "2026-09-01T10:05:00" },
  { targetId: "sub-spotify", targetKind: "subscription", enabled: true, maxAmount: 60, methodId: "pm-visa", noticeDays: 3, createdAt: "2026-09-01T10:06:00" },
];

export const autopayLog: AutopayLogEntry[] = [
  { id: "log-1", targetId: "bill-digi", at: "2026-09-01T10:00:00", text: "Plată automată activată pentru Digi România, cu limita de 100 RON." },
  { id: "log-2", targetId: "sub-netflix", at: "2026-09-01T10:05:00", text: "Plată automată activată pentru Netflix, cu limita de 80 RON." },
  { id: "log-3", targetId: "sub-spotify", at: "2026-09-01T10:06:00", text: "Plată automată activată pentru Spotify Family, cu limita de 60 RON." },
];

export const defaultSettings: Settings = {
  reminderDays: [7, 3, 0],
  channels: { push: true, email: true, sms: false },
  appLock: false,
  monthlyBudget: 3000,
  monthlySummary: true,
};

export const splits: SplitRequest[] = [
  {
    id: "split-intretinere-oct",
    houseId: "acasa",
    title: "Întreținere octombrie",
    total: 325,
    createdAt: "2026-10-12T18:20:00",
    link: "https://pago.ro/s/intretinere-oct",
    shares: [
      { name: "Alexandru", memberId: "m-alex", amount: 162.5, paid: true },
      { name: "Ioana", memberId: "m-ioana", amount: 162.5, paid: false },
    ],
  },
];
