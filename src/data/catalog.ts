import type { BillingCycle, DisputeFlow, ExpiryKind, SelfReadingWindow, SubscriptionCategory, UtilityKind } from "@/types/pago";

export interface ProviderTemplate {
  name: string;
  kind: UtilityKind;
  flow: DisputeFlow;
  amount: number;
  average: number;
  dueDay: number;
  codeLabel: string;
  codeHint: string;
  unit?: "kWh" | "m³";
  pricePerUnit?: number;
  selfReading?: SelfReadingWindow;
}

export const UTILITY_LABEL: Record<UtilityKind, string> = {
  curent: "Curent",
  gaz: "Gaz",
  apa: "Apă",
  salubritate: "Salubritate",
  telecom: "Internet & telefon",
  intretinere: "Întreținere",
};

export const PROVIDER_CATALOG: ProviderTemplate[] = [
  { name: "Electrica Furnizare", kind: "curent", flow: "A", amount: 248, average: 240, dueDay: 26, codeLabel: "Cod client", codeHint: "10 cifre, pe prima pagină a facturii", unit: "kWh", pricePerUnit: 1, selfReading: { fromDay: 1, toDay: 5 } },
  { name: "Hidroelectrica", kind: "curent", flow: "A", amount: 196, average: 205, dueDay: 27, codeLabel: "Cod loc de consum", codeHint: "Începe cu 59, pe factură sau în contul iHidro", unit: "kWh", pricePerUnit: 0.9, selfReading: { fromDay: 20, toDay: 25 } },
  { name: "PPC Energie", kind: "curent", flow: "A", amount: 231, average: 225, dueDay: 28, codeLabel: "Cod eneltel", codeHint: "9 cifre, în colțul din dreapta sus al facturii", unit: "kWh", pricePerUnit: 1.05, selfReading: { fromDay: 10, toDay: 15 } },
  { name: "E.ON Energie", kind: "gaz", flow: "A", amount: 182, average: 175, dueDay: 23, codeLabel: "Cod client", codeHint: "Pe factură sau în contul E.ON Myline", unit: "m³", pricePerUnit: 2.56, selfReading: { fromDay: 15, toDay: 20 } },
  { name: "Engie România", kind: "gaz", flow: "A", amount: 214, average: 190, dueDay: 25, codeLabel: "Cod client", codeHint: "12 cifre, în antetul facturii", unit: "m³", pricePerUnit: 2.7, selfReading: { fromDay: 5, toDay: 10 } },
  { name: "Digi România", kind: "telecom", flow: "B", amount: 62, average: 62, dueDay: 20, codeLabel: "Cod abonat", codeHint: "Pe factură, sub numele tău" },
  { name: "Orange România", kind: "telecom", flow: "B", amount: 78, average: 78, dueDay: 18, codeLabel: "Cod client", codeHint: "În aplicația My Orange, la Contul meu" },
  { name: "Vodafone România", kind: "telecom", flow: "B", amount: 71, average: 70, dueDay: 22, codeLabel: "Cod client", codeHint: "În My Vodafone, la Facturi" },
  { name: "Apa Nova București", kind: "apa", flow: "A", amount: 96, average: 92, dueDay: 27, codeLabel: "Cod client", codeHint: "8 cifre, pe prima pagină a facturii", unit: "m³", pricePerUnit: 7.9, selfReading: { fromDay: 1, toDay: 10 } },
  { name: "Compania de Apă Someș", kind: "apa", flow: "A", amount: 88, average: 84, dueDay: 27, codeLabel: "Cod client", codeHint: "Pe factură, lângă adresa de consum", unit: "m³", pricePerUnit: 6.9, selfReading: { fromDay: 20, toDay: 25 } },
  { name: "Compania de Apă Arieș", kind: "apa", flow: "A", amount: 58, average: 55, dueDay: 22, codeLabel: "Cod client", codeHint: "Pe factură, lângă adresa de consum", unit: "m³", pricePerUnit: 6.4, selfReading: { fromDay: 20, toDay: 25 } },
  { name: "Retim Salubritate", kind: "salubritate", flow: "B", amount: 45, average: 45, dueDay: 30, codeLabel: "Cod client", codeHint: "Pe factură, sub codul de bare" },
  { name: "Supercom", kind: "salubritate", flow: "B", amount: 38, average: 38, dueDay: 28, codeLabel: "Cod client", codeHint: "Pe factură, în partea de sus" },
  { name: "Asociația de proprietari", kind: "intretinere", flow: "B", amount: 310, average: 300, dueDay: 28, codeLabel: "Număr apartament", codeHint: "Numărul apartamentului din lista de întreținere" },
];

export interface SubscriptionPreset {
  name: string;
  price: number;
  cycle: BillingCycle;
  category: SubscriptionCategory;
}

export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = [
  { name: "Netflix", price: 59.99, cycle: "monthly", category: "streaming" },
  { name: "Disney+", price: 34.99, cycle: "monthly", category: "streaming" },
  { name: "HBO Max", price: 29.99, cycle: "monthly", category: "streaming" },
  { name: "SkyShowtime", price: 24.99, cycle: "monthly", category: "streaming" },
  { name: "Voyo", price: 29.99, cycle: "monthly", category: "streaming" },
  { name: "YouTube Premium", price: 29, cycle: "monthly", category: "streaming" },
  { name: "Amazon Prime", price: 180, cycle: "yearly", category: "streaming" },
  { name: "Spotify Premium", price: 27.99, cycle: "monthly", category: "muzica" },
  { name: "Apple Music", price: 26.99, cycle: "monthly", category: "muzica" },
  { name: "iCloud 200 GB", price: 14.99, cycle: "monthly", category: "cloud" },
  { name: "Google One", price: 9.99, cycle: "monthly", category: "cloud" },
  { name: "Dropbox", price: 39, cycle: "monthly", category: "cloud" },
  { name: "Microsoft 365", price: 349, cycle: "yearly", category: "software" },
  { name: "ChatGPT Plus", price: 100, cycle: "monthly", category: "software" },
  { name: "Bitdefender", price: 89.99, cycle: "quarterly", category: "software" },
  { name: "Sală de sport", price: 149, cycle: "monthly", category: "sport" },
  { name: "Digi TV", price: 35, cycle: "monthly", category: "tv" },
];

export const SUBSCRIPTION_CATEGORY_LABEL: Record<SubscriptionCategory, string> = {
  streaming: "Filme și seriale",
  muzica: "Muzică",
  cloud: "Stocare",
  software: "Aplicații",
  sport: "Sport",
  tv: "TV",
  altele: "Altele",
};

export const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "lunar",
  quarterly: "trimestrial",
  yearly: "anual",
};

export const CYCLE_SUFFIX: Record<BillingCycle, string> = {
  monthly: "/lună",
  quarterly: "/3 luni",
  yearly: "/an",
};

export interface RenewalOption {
  id: string;
  label: string;
  detail: string;
  months: number;
  days?: number;
  price: number;
  provider?: string;
  recommended?: boolean;
}

export const RENEWAL_OPTIONS: Record<ExpiryKind, RenewalOption[]> = {
  RCA: [
    { id: "rca-groupama-12", label: "Groupama", detail: "12 luni · decontare directă inclusă", months: 12, price: 1090, provider: "Groupama", recommended: true },
    { id: "rca-omniasig-12", label: "Omniasig", detail: "12 luni", months: 12, price: 1135, provider: "Omniasig" },
    { id: "rca-allianz-12", label: "Allianz-Țiriac", detail: "12 luni · asistență rutieră", months: 12, price: 1210, provider: "Allianz-Țiriac" },
    { id: "rca-groupama-6", label: "Groupama", detail: "6 luni", months: 6, price: 590, provider: "Groupama" },
  ],
  Rovinietă: [
    { id: "rov-12", label: "12 luni", detail: "Autoturism", months: 12, price: 130, recommended: true },
    { id: "rov-3", label: "90 de zile", detail: "Autoturism", months: 3, price: 60 },
    { id: "rov-1", label: "30 de zile", detail: "Autoturism", months: 1, price: 32 },
    { id: "rov-7", label: "7 zile", detail: "Autoturism", months: 0, days: 7, price: 16 },
  ],
  ITP: [
    { id: "itp-12", label: "ITP la stație parteneră", detail: "Valabil 12 luni · programare inclusă", months: 12, price: 140, recommended: true },
    { id: "itp-24", label: "ITP la stație parteneră", detail: "Valabil 24 de luni · mașini sub 12 ani", months: 24, price: 140 },
  ],
  PAD: [{ id: "pad-12", label: "PAD · zona A", detail: "12 luni · asigurarea obligatorie a locuinței", months: 12, price: 130, provider: "PAID", recommended: true }],
};

export const EXPIRY_LABEL: Record<ExpiryKind, string> = {
  RCA: "Asigurare RCA",
  Rovinietă: "Rovinietă",
  ITP: "Inspecție tehnică (ITP)",
  PAD: "Asigurarea locuinței (PAD)",
};

export const EXPIRY_HINT: Record<ExpiryKind, string> = {
  RCA: "Obligatorie pentru orice mașină înmatriculată. Fără ea riști amendă și reținerea plăcuțelor.",
  Rovinietă: "Necesară pe drumurile naționale și autostrăzi, în afara localităților.",
  ITP: "Inspecția periodică a mașinii. Fără ITP valabil, talonul este reținut.",
  PAD: "Asigurarea obligatorie a locuinței împotriva dezastrelor naturale.",
};

export interface TaxDebt {
  id: string;
  title: string;
  authority: string;
  amount: number;
  dueOn: string;
}

export const TAX_DEBTS: TaxDebt[] = [
  { id: "tax-cladire", title: "Impozit pe clădire 2026 · rata 2", authority: "Primăria Cluj-Napoca", amount: 312, dueOn: "2026-11-30" },
  { id: "tax-auto", title: "Impozit auto 2026 · rata 2", authority: "Primăria Cluj-Napoca", amount: 96, dueOn: "2026-11-30" },
];

export const TOPUP_OPERATORS = ["Orange", "Vodafone", "Digi"];
export const TOPUP_AMOUNTS = [25, 35, 50, 100];
export const BRIDGE_TOLL_PRICE = 19;

export interface FaqEntry {
  question: string;
  answer: string;
}

export const FAQ: FaqEntry[] = [
  {
    question: "Cât costă să plătesc prin Pago?",
    answer: "Plata facturilor, a abonamentelor și a asigurărilor are comision 0. Nu există o limită de plăți pe lună. Dacă un serviciu are vreodată un cost, îl vezi în ecranul de plată înainte să confirmi.",
  },
  {
    question: "De unde știu că plata a ajuns la furnizor?",
    answer: "Fiecare plată trece prin trei pași: inițiată, trimisă furnizorului și confirmată de furnizor. Îi vezi în chitanță, împreună cu referința plății. Dacă un pas eșuează, primești imediat motivul și poți reîncerca.",
  },
  {
    question: "Ce se întâmplă dacă o plată eșuează?",
    answer: "Banii nu pleacă din cont. Îți arătăm motivul (de exemplu card expirat sau furnizor deconectat) și un buton prin care rezolvi pe loc: alegi alt card sau reconectezi furnizorul, apoi reîncerci.",
  },
  {
    question: "Cum funcționează plata automată?",
    answer: "Alegi ce plătești automat și stabilești o limită de siguranță. Te anunțăm cu câteva zile înainte, cu data și suma. Dacă suma depășește limita sau factura pare greșită, plata automată se oprește și decizi tu.",
  },
  {
    question: "O factură a dispărut din aplicație. Ce fac?",
    answer: "Verifică starea furnizorului în Facturi → Furnizori. Dacă apare Deconectat, apasă Reconectează. Istoricul tău de plăți rămâne păstrat, nu trebuie să ștergi și să adaugi din nou furnizorul.",
  },
  {
    question: "Cum contest o factură greșită?",
    answer: "Deschide factura marcată ca suspectă. La utilitățile cu contor introduci indexul real, iar la celelalte confirmi linia greșită. Plătești doar suma corectă, iar diferența rămâne înghețată până la factura storno.",
  },
  {
    question: "Cum anulez un abonament?",
    answer: "Din pagina abonamentului alegi Anulează. Îți arătăm până când mai ai acces și pașii de anulare la furnizor. Abonamentul dispare din plățile viitoare, dar îl poți reactiva oricând.",
  },
  {
    question: "Sunt în siguranță datele cardului meu?",
    answer: "Pago nu păstrează numărul cardului. Datele sunt ținute de procesatorul de plăți, iar în aplicație vezi doar ultimele 4 cifre. Poți activa și blocarea aplicației cu amprentă sau PIN.",
  },
];

export const SUPPORT_SUBJECTS = ["O plată nu a ajuns la furnizor", "O factură lipsește sau e greșită", "Problemă cu un card", "Plată automată", "Altceva"];
