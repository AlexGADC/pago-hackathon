import { createInitialState, restoreState, STATE_VERSION, type AppState } from "@/context/appState";
import { applyCommand, applyStep, STEP_DELAY_MS, stepIsDue, SYSTEM_STEPS, type Command, type SystemStep } from "@/context/commands";
import { round2 } from "@/lib/checkout";
import { DEMO_TODAY } from "@/lib/disputes";
import { demoNow } from "@/lib/format";
import { buildEvents } from "@/lib/payments";
import type { CheckoutItem, PaymentRecord } from "@/types/pago";
import { getDb, transaction } from "./db";

export interface StateEnvelope {
  state: AppState;
  revision: number;
}

export class CommandRejected extends Error {
  constructor(
    message: string,
    public status: number = 422,
  ) {
    super(message);
  }
}

interface StateRow {
  version: number;
  revision: number;
  data: string;
}

const ACTIVITY_LIMIT = 500;

function read(userId: string): StateEnvelope | null {
  const row = getDb().prepare("SELECT version, revision, data FROM states WHERE user_id = ?").get(userId) as StateRow | undefined;
  if (!row) return null;
  try {
    return { state: restoreState(JSON.parse(row.data)), revision: row.revision };
  } catch {
    return { state: createInitialState(), revision: row.revision };
  }
}

function write(userId: string, envelope: StateEnvelope): void {
  getDb()
    .prepare(
      "INSERT INTO states (user_id, version, revision, data, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET version = excluded.version, revision = excluded.revision, data = excluded.data, updated_at = excluded.updated_at",
    )
    .run(userId, STATE_VERSION, envelope.revision, JSON.stringify(envelope.state), new Date().toISOString());
}

function recordActivity(userId: string, kind: string, detail: string, revision: number): void {
  const db = getDb();
  db.prepare("INSERT INTO activity (user_id, kind, detail, revision, at) VALUES (?, ?, ?, ?, ?)").run(userId, kind, detail.slice(0, 300), revision, new Date().toISOString());
  db.prepare("DELETE FROM activity WHERE user_id = ? AND id NOT IN (SELECT id FROM activity WHERE user_id = ? ORDER BY id DESC LIMIT ?)").run(userId, userId, ACTIVITY_LIMIT);
}

function recordPayments(userId: string, before: PaymentRecord[], after: PaymentRecord[]): void {
  if (before === after) return;
  const known = new Map(before.map((p) => [p.id, p]));
  const upsert = getDb().prepare(
    "INSERT INTO payments (id, user_id, reference, title, amount, status, method, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at",
  );
  const at = new Date().toISOString();
  for (const p of after) {
    if (known.get(p.id) === p) continue;
    upsert.run(p.id, userId, p.reference, p.title, p.amount, p.status, p.methodLabel, p.createdAt, at);
  }
}

export function loadState(userId: string): StateEnvelope {
  const existing = read(userId);
  if (existing) return existing;
  const created: StateEnvelope = { state: createInitialState(), revision: 1 };
  write(userId, created);
  return created;
}

function mutate(userId: string, kind: string, detail: string, change: (state: AppState) => AppState): StateEnvelope & { changed: boolean } {
  return transaction(() => {
    const current = loadState(userId);
    const next = change(current.state);
    if (next === current.state) return { ...current, changed: false };
    const envelope: StateEnvelope = { state: next, revision: current.revision + 1 };
    write(userId, envelope);
    recordPayments(userId, current.state.payments, next.payments);
    recordActivity(userId, kind, detail, envelope.revision);
    return { ...envelope, changed: true };
  });
}

function assertUnique(taken: boolean): void {
  if (taken) throw new CommandRejected("Există deja un element cu acest identificator.", 409);
}

function assertHouse(state: AppState, houseId: string): void {
  if (!state.houses.some((h) => h.id === houseId)) throw new CommandRejected("Profilul nu există.", 404);
}

function assertAmount(state: AppState, item: CheckoutItem): void {
  assertHouse(state, item.houseId);
  if (item.targetKind !== "bill" && item.targetKind !== "subscription") return;
  const ledger = { bills: state.bills, subscriptions: state.subscriptions, expiries: state.expiries, payments: state.payments, tickets: state.tickets, autopay: state.autopay };
  const year = Number(DEMO_TODAY.slice(0, 4));
  const event = [year - 1, year, year + 1].flatMap((y) => buildEvents(ledger, item.houseId, y)).find((e) => e.id === item.eventId);
  if (!event) throw new CommandRejected("Plata nu mai există. Reîncarcă pagina.", 404);
  if (event.paid) throw new CommandRejected("Această plată este deja făcută.", 409);
  if (Math.abs(round2(event.amount) - round2(item.amount)) > 0.01) throw new CommandRejected("Suma nu corespunde cu cea datorată. Reîncarcă pagina.");
}

function guard(state: AppState, command: Command): void {
  switch (command.type) {
    case "pay":
      if (!state.methods.some((m) => m.id === command.args.methodId)) throw new CommandRejected("Cardul ales nu există.", 404);
      assertUnique(state.payments.some((p) => p.id === `pay-${command.args.stamp}-0`));
      command.args.items.forEach((item) => assertAmount(state, item));
      return;
    case "payExternally":
      assertAmount(state, command.args.item);
      return;
    case "submitDispute": {
      const bill = state.bills.find((b) => b.id === command.args.ticket.billId);
      if (!bill) throw new CommandRejected("Factura nu există.", 404);
      assertUnique(state.tickets.some((t) => t.id === command.args.ticket.id));
      if (state.tickets.some((t) => t.billId === bill.id && t.stage !== "stornata")) throw new CommandRejected("Factura are deja o sesizare deschisă.", 409);
      if (Math.abs(command.args.ticket.paidAmount + command.args.ticket.disputedAmount - bill.amount) > 0.01) throw new CommandRejected("Sumele din sesizare nu corespund facturii.");
      return;
    }
    case "connectProvider":
      assertHouse(state, command.args.houseId);
      return;
    case "addSubscription":
      assertHouse(state, command.args.sub.houseId);
      assertUnique(state.subscriptions.some((s) => s.id === command.args.sub.id));
      return;
    case "addExpiry":
      assertHouse(state, command.args.item.houseId);
      assertUnique(state.expiries.some((e) => e.id === command.args.item.id));
      return;
    case "addMethod":
      assertUnique(state.methods.some((m) => m.id === command.args.method.id));
      return;
    case "saveAutopay":
      if (!state.methods.some((m) => m.id === command.args.methodId)) throw new CommandRejected("Cardul ales nu există.", 404);
      return;
    case "addHouse":
      assertUnique(state.houses.some((h) => h.id === command.args.house.id));
      if (state.houses.length >= 12) throw new CommandRejected("Ai atins numărul maxim de profiluri.");
      return;
    case "setActiveHouse":
      assertHouse(state, command.args.id);
      return;
    case "inviteMember":
      assertUnique(state.members.some((m) => m.id === command.args.member.id));
      return;
    case "createSplit":
      assertHouse(state, command.args.split.houseId);
      assertUnique(state.splits.some((s) => s.id === command.args.split.id));
      return;
    case "createSupportTicket":
      assertUnique(state.supportTickets.some((t) => t.id === command.args.ticket.id));
      return;
    default:
      return;
  }
}

function describe(command: Command): string {
  switch (command.type) {
    case "pay":
      return command.args.items.map((item) => `${item.title} ${item.amount}`).join(", ");
    case "payExternally":
      return command.args.item.title;
    case "submitDispute":
      return command.args.ticket.billId;
    case "addSubscription":
      return command.args.sub.name;
    case "addExpiry":
      return `${command.args.item.kind} ${command.args.item.subject}`;
    case "connectProvider":
      return command.args.template.name;
    default:
      return "";
  }
}

export function runCommand(userId: string, command: Command): StateEnvelope {
  const result = mutate(userId, command.type, describe(command), (state) => {
    guard(state, command);
    return applyCommand(state, command);
  });
  schedule(userId, result.state);
  return { state: result.state, revision: result.revision };
}

export function resetState(userId: string): StateEnvelope {
  cancel(userId);
  const result = mutate(userId, "reset", "", () => createInitialState());
  return { state: result.state, revision: result.revision };
}

export function currentState(userId: string): StateEnvelope {
  const envelope = loadState(userId);
  schedule(userId, envelope.state);
  return envelope;
}

export function listActivity(userId: string, limit = 50): { kind: string; detail: string; revision: number; at: string }[] {
  return getDb().prepare("SELECT kind, detail, revision, at FROM activity WHERE user_id = ? ORDER BY id DESC LIMIT ?").all(userId, limit) as { kind: string; detail: string; revision: number; at: string }[];
}

export function listPayments(userId: string): Record<string, unknown>[] {
  return getDb().prepare("SELECT id, reference, title, amount, status, method, created_at AS createdAt, updated_at AS updatedAt FROM payments WHERE user_id = ? ORDER BY created_at DESC").all(userId) as Record<string, unknown>[];
}

type Timers = Map<string, Partial<Record<SystemStep, ReturnType<typeof setTimeout>>>>;

const holder = globalThis as typeof globalThis & { pagoTimers?: Timers };
const timers: Timers = (holder.pagoTimers ??= new Map());

export function runStep(userId: string, step: SystemStep): StateEnvelope {
  const result = mutate(userId, `system:${step}`, "", (state) => applyStep(state, step, demoNow()));
  return { state: result.state, revision: result.revision };
}

function schedule(userId: string, state: AppState): void {
  const now = demoNow();
  const mine = timers.get(userId) ?? {};
  timers.set(userId, mine);
  for (const step of SYSTEM_STEPS) {
    if (mine[step] || !stepIsDue(state, step, now)) continue;
    const timer = setTimeout(() => {
      delete mine[step];
      try {
        schedule(userId, runStep(userId, step).state);
      } catch {
        return;
      }
    }, STEP_DELAY_MS[step]);
    timer.unref?.();
    mine[step] = timer;
  }
}

export function cancel(userId: string): void {
  const mine = timers.get(userId);
  if (!mine) return;
  for (const step of SYSTEM_STEPS) {
    const timer = mine[step];
    if (timer) clearTimeout(timer);
  }
  timers.delete(userId);
}
