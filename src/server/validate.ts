import type { Command, CommandArgs, CommandType } from "@/context/commands";
import { isCommandType } from "@/context/commands";
import { PROVIDER_CATALOG } from "@/data/catalog";
import { DEMO_TODAY } from "@/lib/disputes";

export class ValidationError extends Error {}

type Check<T> = (value: unknown, path: string) => T;

function fail(path: string, expected: string): never {
  throw new ValidationError(`Câmpul „${path}” nu este valid (${expected}).`);
}

const text =
  (max: number, min = 0): Check<string> =>
  (value, path) => {
    if (typeof value !== "string" || value.length < min || value.length > max) fail(path, `text de ${min}-${max} caractere`);
    return value as string;
  };

const pattern =
  (regex: RegExp, label: string): Check<string> =>
  (value, path) => {
    if (typeof value !== "string" || !regex.test(value)) fail(path, label);
    return value as string;
  };

const number =
  (min: number, max: number, integer = false): Check<number> =>
  (value, path) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(path, `număr între ${min} și ${max}`);
    return value as number;
  };

const bool: Check<boolean> = (value, path) => {
  if (typeof value !== "boolean") fail(path, "adevărat sau fals");
  return value as boolean;
};

const oneOf =
  <T extends string | number>(...options: T[]): Check<T> =>
  (value, path) => {
    if (!options.includes(value as T)) fail(path, `una dintre: ${options.join(", ")}`);
    return value as T;
  };

const optional =
  <T>(check: Check<T>): Check<T | undefined> =>
  (value, path) =>
    value === undefined || value === null ? undefined : check(value, path);

const nullable =
  <T>(check: Check<T>): Check<T | null> =>
  (value, path) =>
    value === null ? null : check(value, path);

const list =
  <T>(check: Check<T>, max: number, min = 0): Check<T[]> =>
  (value, path) => {
    if (!Array.isArray(value) || value.length < min || value.length > max) fail(path, `listă cu ${min}-${max} elemente`);
    return (value as unknown[]).map((item, index) => check(item, `${path}[${index}]`));
  };

type Shape<T> = { [K in keyof T]-?: Check<T[K]> };

function clean<T extends object>(result: T): T {
  for (const key of Object.keys(result) as (keyof T)[]) if (result[key] === undefined) delete result[key];
  return result;
}

const object =
  <T extends object>(shape: Shape<T>): Check<T> =>
  (value, path) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "obiect");
    const source = value as Record<string, unknown>;
    const result = {} as T;
    for (const key of Object.keys(shape) as (keyof T & string)[]) result[key] = shape[key](source[key], `${path}.${key}`);
    return clean(result);
  };

const partial =
  <T extends object>(shape: Shape<T>): Check<Partial<T>> =>
  (value, path) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "obiect");
    const source = value as Record<string, unknown>;
    const result: Partial<T> = {};
    for (const key of Object.keys(shape) as (keyof T & string)[]) {
      if (source[key] === undefined) continue;
      result[key] = shape[key](source[key], `${path}.${key}`);
    }
    return result;
  };

const id = pattern(/^[\p{L}\p{N} ._+*:&'()/-]{1,120}$/u, "identificator");
const newId = pattern(/^[a-z]+-[a-z0-9-]{1,60}$/, "identificator nou");
const date = pattern(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "dată AAAA-LL-ZZ");
const demoNow: Check<string> = (value, path) => {
  const stamp = pattern(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, "dată și oră")(value, path);
  if (!stamp.startsWith(DEMO_TODAY)) fail(path, "data demo curentă");
  return stamp;
};
const stamp = number(1e12, 1e14, true);
const money = number(0, 1_000_000);
const label = text(120, 1);

const targetKind = oneOf("bill", "subscription", "expiry", "extra");
const category = oneOf("utilitati", "abonamente", "asigurari", "servicii");

const renewal = object<NonNullable<CommandArgs["pay"]["items"][number]["renew"]>>({
  expiresOn: date,
  price: money,
  provider: optional(text(80)),
});

const checkoutItem = object<CommandArgs["pay"]["items"][number]>({
  eventId: id,
  targetId: optional(id),
  targetKind,
  houseId: id,
  title: label,
  subtitle: optional(text(200)),
  amount: money,
  category,
  renew: optional(renewal),
});

const subscriptionShape: Shape<CommandArgs["addSubscription"]["sub"]> = {
  id: newId,
  houseId: id,
  name: text(60, 2),
  price: money,
  cycle: oneOf("monthly", "quarterly", "yearly"),
  renewsOn: date,
  category: oneOf("streaming", "muzica", "cloud", "software", "sport", "tv", "altele"),
  status: oneOf("activ", "pauza", "anulat"),
  startedOn: optional(date),
  statusChangedOn: optional(date),
  previousPrice: optional(money),
  priceChangedOn: optional(date),
  trialEndsOn: optional(date),
  lastUsedDaysAgo: optional(number(0, 10_000, true)),
  sharedWith: optional(list(text(60), 20)),
};

const expiryShape: Shape<CommandArgs["addExpiry"]["item"]> = {
  id: newId,
  houseId: id,
  kind: oneOf("RCA", "Rovinietă", "ITP", "PAD"),
  subject: text(120, 2),
  expiresOn: date,
  price: money,
  provider: optional(text(80)),
};

const settingsShape: Shape<CommandArgs["updateSettings"]["patch"] & object> = {
  reminderDays: list(number(0, 60, true), 8),
  channels: object({ push: bool, email: bool, sms: bool }),
  appLock: bool,
  monthlyBudget: nullable(money),
  monthlySummary: bool,
};

const { id: _subscriptionId, ...subscriptionPatch } = subscriptionShape;
const { id: _expiryId, ...expiryPatch } = expiryShape;
void _subscriptionId;
void _expiryId;

const validators: { [K in CommandType]: Check<CommandArgs[K]> } = {
  pay: object({ items: list(checkoutItem, 40, 1), methodId: id, usePoints: bool, now: demoNow, stamp }),
  payExternally: object({ item: checkoutItem, now: demoNow, stamp }),
  submitDispute: object({
    ticket: object({
      id: pattern(/^tkt-[\w-]{1,80}$/, "identificator de sesizare"),
      billId: id,
      houseId: id,
      createdAt: demoNow,
      stage: oneOf("trimisa"),
      legalDeadlineDays: oneOf(15, 30),
      confidence: oneOf("Declarat manual de client (supus regularizării)", "Confirmat de client (fără contor)"),
      realIndex: optional(number(0, 100_000_000)),
      disputedAmount: money,
      paidAmount: money,
      message: text(2000, 1),
      resolvedAt: () => undefined,
    }),
    now: demoNow,
    stamp,
  }),
  reconnect: object({ provider: label, houseId: id }),
  connectProvider: (value, path) => {
    const args = object({ template: object({ name: label }), houseId: id, clientCode: text(40, 3), now: demoNow, stamp })(value, path);
    const template = PROVIDER_CATALOG.find((p) => p.name === args.template.name);
    if (!template) fail(`${path}.template`, "furnizor din catalog");
    return { ...args, template: template! };
  },
  removeProvider: object({ provider: label, houseId: id }),
  addSubscription: object({ sub: object(subscriptionShape) }),
  updateSubscription: object({ id, patch: partial(subscriptionPatch as Shape<Omit<CommandArgs["addSubscription"]["sub"], "id">>) }),
  setSubscriptionStatus: object({ id, status: oneOf("activ", "pauza", "anulat") }),
  removeSubscription: object({ id }),
  addExpiry: object({ item: object(expiryShape) }),
  updateExpiry: object({ id, patch: partial(expiryPatch as Shape<Omit<CommandArgs["addExpiry"]["item"], "id">>) }),
  removeExpiry: object({ id }),
  saveAutopay: object({ targetId: id, targetKind, maxAmount: number(1, 1_000_000), methodId: id, noticeDays: number(0, 30, true), name: label, now: demoNow, stamp }),
  disableAutopay: object({ targetId: id, name: label, now: demoNow, stamp }),
  addMethod: object({
    method: object({
      id: newId,
      brand: oneOf("visa", "mastercard"),
      last4: pattern(/^\d{4}$/, "ultimele 4 cifre"),
      holder: text(60, 2),
      expMonth: number(1, 12, true),
      expYear: number(2020, 2100, true),
      label: text(40, 1),
      isDefault: bool,
    }),
  }),
  removeMethod: object({ id }),
  setDefaultMethod: object({ id }),
  updateSettings: object({ patch: partial(settingsShape) }),
  addHouse: object({ house: object({ id: newId, name: text(40, 2), emoji: text(8), address: text(120), avatar: pattern(/^\/avatars\/[\w-]+\.svg$/, "avatar") }) }),
  setActiveHouse: object({ id }),
  inviteMember: object({
    member: object({ id: newId, name: text(40, 2), role: oneOf("admin", "junior", "protejat"), avatar: text(8), points: oneOf(0), pending: (value, path) => (bool(value, path) ? true : fail(path, "invitație în așteptare")) }),
  }),
  removeMember: object({ id }),
  completeMission: object({ id }),
  submitReading: object({ billId: id, index: number(0, 100_000_000), now: demoNow }),
  createSplit: object({
    split: object({
      id: newId,
      houseId: id,
      title: text(80, 2),
      total: number(0.01, 1_000_000),
      shares: list(object({ name: text(40, 1), memberId: optional(id), amount: money, paid: bool }), 20, 2),
      createdAt: demoNow,
      link: pattern(/^https:\/\/pago\.ro\/s\/[a-z0-9]{1,20}$/, "link de plată"),
    }),
  }),
  toggleShare: object({ splitId: id, index: number(0, 50, true) }),
  removeSplit: object({ id }),
  createSupportTicket: object({
    ticket: object({ id: newId, subject: text(120, 2), message: text(2000, 2), createdAt: demoNow, status: oneOf("deschis"), reply: () => undefined }),
  }),
  snoozeReminder: object({ eventId: id }),
  markNotificationsRead: object({ ids: list(text(200, 1), 500) }),
  finishOnboarding: () => ({}),
};

export function parseCommand(body: unknown): Command {
  if (!body || typeof body !== "object") throw new ValidationError("Cererea nu are forma așteptată.");
  const { type, args } = body as { type?: unknown; args?: unknown };
  if (!isCommandType(type)) throw new ValidationError("Acțiune necunoscută.");
  const check = validators[type] as Check<CommandArgs[CommandType]>;
  return { type, args: check(args ?? {}, type) } as Command;
}

export function parseCredentials(body: unknown): { email: string; password: string; name: string } {
  return object({ email: text(200, 3), password: text(200, 1), name: (value, path) => (value === undefined ? "" : text(60)(value, path)) })(body, "cont");
}

export function parseFields<T extends object>(body: unknown, fields: (keyof T & string)[]): Record<keyof T & string, string> {
  const shape = Object.fromEntries(fields.map((field) => [field, text(200, 1)])) as Shape<Record<keyof T & string, string>>;
  return object(shape)(body, "cerere");
}
