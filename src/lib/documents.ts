import { CYCLE_LABEL, EXPIRY_LABEL, SUBSCRIPTION_CATEGORY_LABEL, UTILITY_LABEL } from "@/data/catalog";
import { round2 } from "@/lib/checkout";
import { fmtNum, hasWorkingDayDeadline, legalDeadlineLabel } from "@/lib/disputes";
import { addDays, fmtDate, fmtDateTime, fmtMonthYear, hashOf } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/history";
import { billEventId, CATEGORY_META } from "@/lib/payments";
import { nextRenewal } from "@/lib/subscriptions";
import type { Bill, DisputeTicket, ExpiryItem, House, PaymentCategory, PaymentRecord, Subscription } from "@/types/pago";

export type DocTone = "success" | "warning" | "alert" | "info" | "neutral";
export type StepState = "done" | "active" | "todo" | "failed";

export interface DocRow {
  label: string;
  value: string;
}

export interface DocParty {
  label: string;
  name: string;
  lines: string[];
}

export interface DocStatus {
  label: string;
  tone: DocTone;
}

export interface DocStep {
  label: string;
  detail: string;
  state: StepState;
}

export interface DocAmount extends DocRow {
  tone: DocTone;
}

export interface DocumentContext {
  payerName: string;
  houses: House[];
  bills: Bill[];
  subscriptions: Subscription[];
  expiries: ExpiryItem[];
  tickets: DisputeTicket[];
  generatedAt: string;
}

export interface ReceiptDocument {
  heading: string;
  number: string;
  issued: string;
  status: DocStatus;
  badges: string[];
  amountLabel: string;
  amount: string;
  title: string;
  subtitle: string;
  category: PaymentCategory;
  payer: DocParty;
  payee: DocParty;
  details: DocRow[];
  summary: DocRow[];
  total: DocRow;
  points: string | null;
  steps: DocStep[];
  note: string | null;
  verify: string;
  generated: string;
  disclaimer: string;
  fileName: string;
}

export interface DisputeDocument {
  heading: string;
  number: string;
  issued: string;
  status: DocStatus;
  subject: string;
  recipient: DocParty;
  sender: DocParty;
  invoice: DocRow[];
  reasonTitle: string;
  reasonText: string;
  reasonRows: DocRow[];
  flagged: string[];
  amounts: DocAmount[];
  requests: string[];
  declaration: string;
  resolution: string | null;
  signature: { name: string; line: string };
  generated: string;
  disclaimer: string;
  fileName: string;
}

const NBSP = String.fromCharCode(160);
const exactFormat = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fmtMoney(amount: number): string {
  return `${exactFormat.format(round2(amount))} RON`;
}

export function disputeNumber(ticket: DisputeTicket): string {
  return `SZ-${String(hashOf(ticket.id) % 1_000_000).padStart(6, "0")}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("ro-RO") + text.slice(1);
}

function paidPeriod(eventId: string): string | null {
  const match = /-(\d{4})-(\d{2})$/.exec(eventId);
  return match ? fmtMonthYear(Number(match[1]), Number(match[2])) : null;
}

function houseLines(houses: House[], houseId: string): string[] {
  const house = houses.find((h) => h.id === houseId);
  return house ? [house.name, house.address] : [];
}

function targetDetails(record: PaymentRecord, context: DocumentContext): { type: string; rows: DocRow[]; payee?: string } {
  if (record.targetKind === "bill") {
    const bill = context.bills.find((b) => b.id === record.targetId);
    if (!bill) return { type: "Factură de utilități", rows: [] };
    const current = billEventId(bill) === record.eventId;
    const ticket = current ? context.tickets.find((t) => t.billId === bill.id) : undefined;
    const period = paidPeriod(record.eventId);
    const rows: DocRow[] = [{ label: "Serviciu", value: UTILITY_LABEL[bill.kind] }];
    if (current) rows.push({ label: "Număr factură", value: bill.invoiceNumber });
    else if (period) rows.push({ label: "Luna facturată", value: period });
    rows.push({ label: "Cod client", value: bill.clientCode });
    if (current) rows.push({ label: "Scadență", value: fmtDate(bill.dueDate) });
    if (ticket) {
      rows.push({
        label: "Sesizare",
        value: ticket.stage === "stornata" ? `Stornat: ${fmtMoney(ticket.disputedAmount)}` : `Contestat: ${fmtMoney(ticket.disputedAmount)}`,
      });
    }
    return { type: "Factură de utilități", rows };
  }

  if (record.targetKind === "subscription") {
    const sub = context.subscriptions.find((s) => s.id === record.targetId);
    if (!sub) return { type: "Abonament", rows: [] };
    const period = paidPeriod(record.eventId);
    const next = sub.status === "activ" ? nextRenewal(sub, context.generatedAt.slice(0, 10)) : null;
    const rows: DocRow[] = [
      { label: "Categorie", value: SUBSCRIPTION_CATEGORY_LABEL[sub.category] },
      { label: "Facturare", value: capitalize(CYCLE_LABEL[sub.cycle]) },
    ];
    if (period) rows.push({ label: "Perioada plătită", value: period });
    if (next) rows.push({ label: "Următoarea plată", value: fmtDate(next) });
    return { type: "Abonament", rows };
  }

  if (record.targetKind === "expiry") {
    const item = context.expiries.find((e) => e.id === record.targetId);
    if (!item) return { type: "Asigurări și taxe auto", rows: [] };
    const provider = record.renew?.provider ?? item.provider;
    const rows: DocRow[] = [{ label: "Pentru", value: item.subject }];
    if (provider) rows.push({ label: "Emitent", value: provider });
    rows.push({ label: "Valabil până pe", value: fmtDate(record.renew?.expiresOn ?? item.expiresOn) });
    return { type: EXPIRY_LABEL[item.kind], rows, payee: provider };
  }

  return { type: "Plată rapidă", rows: [{ label: "Serviciu", value: record.title }] };
}

function receiptSteps(record: PaymentRecord, payee: string): DocStep[] {
  if (record.external) {
    return [{ label: "Marcată ca plătită", detail: `Plătită în afara aplicației și notată pe ${fmtDateTime(record.createdAt)}.`, state: "done" }];
  }
  const started: DocStep = { label: "Plată inițiată", detail: fmtDateTime(record.createdAt), state: "done" };
  if (record.status === "esuata") {
    return [started, { label: "Plata a eșuat", detail: "Banii nu au plecat din cont.", state: "failed" }];
  }
  const sent = record.status === "trimisa" || record.status === "confirmata";
  const confirmed = record.status === "confirmata";
  return [
    started,
    { label: "Trimisă către furnizor", detail: sent ? `Apare pe extras ca ${record.payee}` : "Trimitem banii către furnizor.", state: sent ? "done" : "active" },
    {
      label: "Confirmată de furnizor",
      detail: confirmed ? `${payee} a înregistrat plata.` : sent ? "Așteptăm confirmarea furnizorului." : "Urmează după trimitere.",
      state: confirmed ? "done" : sent ? "active" : "todo",
    },
  ];
}

const RECEIPT_WORDING: Record<PaymentRecord["status"], { heading: string; amountLabel: string; totalLabel: string; tone: DocTone }> = {
  confirmata: { heading: "Chitanță de plată", amountLabel: "Suma plătită", totalLabel: "Total plătit", tone: "success" },
  trimisa: { heading: "Plată în curs", amountLabel: "Suma de plată", totalLabel: "Total de plată", tone: "warning" },
  procesare: { heading: "Plată în curs", amountLabel: "Suma de plată", totalLabel: "Total de plată", tone: "warning" },
  esuata: { heading: "Plată nereușită", amountLabel: "Suma neîncasată", totalLabel: "Total neîncasat", tone: "alert" },
};

export function receiptDocument(record: PaymentRecord, context: DocumentContext): ReceiptDocument {
  const wording = RECEIPT_WORDING[record.status];
  const target = targetDetails(record, context);
  const payee = target.payee ?? record.title;
  const badges: string[] = [];
  if (record.auto) badges.push("Plată automată");
  if (record.external) badges.push("În afara aplicației");

  const summary: DocRow[] = [{ label: "Valoarea serviciului", value: fmtMoney(record.amount + record.discount) }];
  if (record.discount > 0) summary.push({ label: `Reducere din ${fmtNum(record.pointsUsed)} puncte Pago`, value: `−${fmtMoney(record.discount)}` });
  summary.push({ label: "Comision Pago", value: fmtMoney(record.fee) });

  return {
    heading: wording.heading,
    number: record.reference,
    issued: `Emisă pe ${fmtDateTime(record.createdAt)}`,
    status: { label: STATUS_LABEL[record.status], tone: wording.tone },
    badges,
    amountLabel: wording.amountLabel,
    amount: fmtMoney(record.amount + record.fee),
    title: record.title,
    subtitle: `${CATEGORY_META[record.category].label} · ${target.type}`,
    category: record.category,
    payer: { label: "Plătitor", name: context.payerName, lines: houseLines(context.houses, record.houseId) },
    payee: {
      label: "Beneficiar",
      name: payee,
      lines: record.external ? ["Plată făcută în afara aplicației"] : [`Pe extrasul bancar: ${record.payee}`, "Plată intermediată de Pago"],
    },
    details: [
      { label: "Tip plată", value: target.type },
      ...target.rows,
      { label: "Metodă de plată", value: record.methodLabel },
      { label: "Data plății", value: fmtDateTime(record.createdAt) },
      { label: "Referință", value: record.reference },
    ],
    summary,
    total: { label: wording.totalLabel, value: fmtMoney(record.amount + record.fee) },
    points: record.pointsEarned > 0 ? `Ai primit ${fmtNum(record.pointsEarned)} puncte Pago pentru această plată.` : null,
    steps: receiptSteps(record, payee),
    note: record.status === "esuata" ? (record.failureReason ?? "Banii nu au plecat din cont.") : null,
    verify: `Găsești plata în aplicație, la Istoric, după referința ${record.reference}.`,
    generated: `Generat din Pago Home & Family pe ${fmtDateTime(context.generatedAt)}`,
    disclaimer: "Document demonstrativ. Plățile din acest prototip sunt simulate, iar documentul nu este un document fiscal.",
    fileName: `chitanta-${record.reference}.pdf`,
  };
}

const DISPUTE_STATUS: Record<DisputeTicket["stage"], DocStatus> = {
  trimisa: { label: "Trimisă", tone: "info" },
  in_analiza: { label: "În analiză la furnizor", tone: "warning" },
  stornata: { label: "Soluționată prin storno", tone: "success" },
};

export function disputeDocument(ticket: DisputeTicket, bill: Bill, context: DocumentContext): DisputeDocument {
  const billed = round2(ticket.paidAmount + ticket.disputedAmount);
  const closed = ticket.stage === "stornata";
  const overAverage = bill.averageAmount > 0 ? Math.round(((billed - bill.averageAmount) / bill.averageAmount) * 100) : 0;
  const house = context.houses.find((h) => h.id === bill.houseId);
  const meter = bill.meter;
  const metered = meter !== undefined && ticket.realIndex !== undefined;

  const invoice: DocRow[] = [
    { label: "Număr factură", value: bill.invoiceNumber },
    { label: "Data emiterii", value: fmtDate(bill.issueDate) },
    { label: "Scadență", value: fmtDate(bill.dueDate) },
    { label: "Serviciu", value: UTILITY_LABEL[bill.kind] },
    { label: "Suma facturată", value: fmtMoney(billed) },
    { label: "Media pe 12 luni", value: fmtMoney(bill.averageAmount) },
  ];
  if (overAverage > 0) invoice.push({ label: "Față de medie", value: `+${fmtNum(overAverage)}%` });

  const reasonRows: DocRow[] = [];
  let reasonTitle = "Sumă nejustificată pe factură";
  let reasonText = bill.anomaly?.reason ?? "Suma facturată nu corespunde serviciilor primite.";
  if (meter && ticket.realIndex !== undefined) {
    const consumption = round2(ticket.realIndex - meter.lastConfirmedIndex);
    reasonTitle = "Index estimat greșit";
    reasonText = `Factura a fost emisă pe baza unui index estimat. Indexul citit de pe contor este ${fmtNum(ticket.realIndex)} ${meter.unit}, deci consumul real este de ${fmtNum(consumption)} ${meter.unit}.`;
    reasonRows.push({ label: "Ultimul index", value: `${fmtNum(meter.lastConfirmedIndex)} ${meter.unit}` });
    if (!closed) reasonRows.push({ label: "Index facturat", value: `${fmtNum(meter.billedIndex)} ${meter.unit}` });
    reasonRows.push({ label: "Index real", value: `${fmtNum(ticket.realIndex)} ${meter.unit}` });
    reasonRows.push({ label: "Consum real", value: `${fmtNum(consumption)} ${meter.unit}` });
    reasonRows.push({ label: "Preț unitar", value: `${fmtNum(meter.pricePerUnit)} RON/${meter.unit}` });
  }

  const partial = ticket.paidAmount > 0;
  const deadline = hasWorkingDayDeadline(bill)
    ? `Un răspuns în scris în termenul legal de ${legalDeadlineLabel(bill)} de la primirea sesizării.`
    : `Un răspuns în scris în termenul legal de ${legalDeadlineLabel(bill)}, adică până pe ${fmtDate(addDays(ticket.createdAt.slice(0, 10), ticket.legalDeadlineDays))}.`;

  return {
    heading: "Sesizare",
    number: disputeNumber(ticket),
    issued: `Trimisă pe ${fmtDateTime(ticket.createdAt)}`,
    status: DISPUTE_STATUS[ticket.stage],
    subject: `Contestarea facturii ${bill.invoiceNumber} din ${fmtDate(bill.issueDate).replace(/ /g, NBSP)}`,
    recipient: { label: "Către", name: bill.provider, lines: ["Serviciul de relații cu clienții", `Serviciu: ${UTILITY_LABEL[bill.kind]}`] },
    sender: {
      label: "De la",
      name: context.payerName,
      lines: [`Cod client: ${bill.clientCode}`, ...(house ? [`Loc de consum: ${house.address}`] : [])],
    },
    invoice,
    reasonTitle,
    reasonText,
    reasonRows,
    flagged: metered ? [] : (bill.anomaly?.suspiciousLines ?? []),
    amounts: [
      { label: "Sumă facturată", value: fmtMoney(billed), tone: "neutral" },
      { label: partial ? "Sumă corectă, achitată" : "Sumă achitată", value: fmtMoney(ticket.paidAmount), tone: "success" },
      { label: "Diferență contestată", value: fmtMoney(ticket.disputedAmount), tone: "alert" },
    ],
    requests: [
      partial
        ? `Suspendarea plății pentru diferența de ${fmtMoney(ticket.disputedAmount)}, până la soluționarea sesizării.`
        : `Suspendarea plății pentru întreaga sumă de ${fmtMoney(ticket.disputedAmount)}, până la soluționarea sesizării.`,
      "Verificarea facturii și emiterea facturii storno pentru suma contestată.",
      deadline,
    ],
    declaration:
      ticket.confidence === "Declarat manual de client (supus regularizării)"
        ? "Indexul a fost declarat de client pe propria răspundere și este supus regularizării la următoarea citire a contorului."
        : "Clientul confirmă pe propria răspundere că suma contestată nu corespunde serviciilor primite.",
    resolution: closed
      ? `${bill.provider} a emis factura storno${ticket.resolvedAt ? ` pe ${fmtDateTime(ticket.resolvedAt)}` : ""}. Diferența de ${fmtMoney(ticket.disputedAmount)} a fost anulată, iar factura corectă este de ${fmtMoney(ticket.paidAmount)}.`
      : null,
    signature: { name: context.payerName, line: `Trimisă electronic prin Pago, pe ${fmtDate(ticket.createdAt)}` },
    generated: `Generat din Pago Home & Family pe ${fmtDateTime(context.generatedAt)}`,
    disclaimer: "Document demonstrativ. În acest prototip sesizarea nu este transmisă real furnizorului.",
    fileName: `sesizare-${disputeNumber(ticket)}.pdf`,
  };
}
