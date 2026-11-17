import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createInitialState } from "@/context/appState";
import { applyCommand, hasPendingWork, type Command } from "@/context/commands";
import { PROVIDER_CATALOG } from "@/data/catalog";
import { buildEvents, toCheckoutItem } from "@/lib/payments";
import { AuthError, authenticate, changePassword, createSession, createUser, deleteUser, destroySession, hashPassword, userForToken, verifyPassword } from "./auth";
import { closeDb, getDb } from "./db";
import { assertSameOrigin, HttpError, rateLimit, readToken, sessionCookie } from "./http";
import { CommandRejected, currentState, listActivity, listPayments, loadState, resetState, runCommand, runStep, cancel } from "./stateRepo";
import { parseCommand, ValidationError } from "./validate";

const NOW = "2026-11-16T10:00:00";

function digiItem() {
  const state = createInitialState();
  const ledger = { bills: state.bills, subscriptions: state.subscriptions, expiries: state.expiries, payments: [], tickets: [], autopay: state.autopay };
  const event = buildEvents(ledger, "acasa", 2026).find((e) => e.id === "bill-digi-2026-11");
  if (!event) throw new Error("missing demo bill");
  return toCheckoutItem(event);
}

function payCommand(stamp: number, amount?: number): Command {
  const item = digiItem();
  return { type: "pay", args: { items: [{ ...item, amount: amount ?? item.amount }], methodId: "pm-visa", usePoints: false, now: NOW, stamp } };
}

beforeAll(() => {
  process.env.PAGO_DB_PATH = ":memory:";
  closeDb();
  getDb();
});

afterAll(() => {
  closeDb();
  delete process.env.PAGO_DB_PATH;
});

describe("accounts", () => {
  it("hashes passwords with a salt and verifies them", () => {
    const first = hashPassword("parola-mea-1");
    const second = hashPassword("parola-mea-1");
    expect(first).not.toBe(second);
    expect(first).not.toContain("parola-mea-1");
    expect(verifyPassword("parola-mea-1", first)).toBe(true);
    expect(verifyPassword("alta-parola", first)).toBe(false);
    expect(verifyPassword("parola-mea-1", "stricat")).toBe(false);
  });

  it("creates a user once and normalises the e-mail", () => {
    const user = createUser({ email: "  Ana@Exemplu.RO ", name: "Ana Pop", password: "parola-ana-1" });
    expect(user.email).toBe("ana@exemplu.ro");
    expect(() => createUser({ email: "ana@exemplu.ro", name: "Ana", password: "parola-ana-2" })).toThrowError(AuthError);
    expect(() => createUser({ email: "fara-arond", name: "Ion", password: "parola-ion-1" })).toThrowError(/e-mail/);
    expect(() => createUser({ email: "ion@exemplu.ro", name: "Ion", password: "scurta" })).toThrowError(/8 caractere/);
  });

  it("authenticates only with the right password", () => {
    expect(authenticate("ANA@exemplu.ro", "parola-ana-1").name).toBe("Ana Pop");
    expect(() => authenticate("ana@exemplu.ro", "gresita")).toThrowError(/greșită/);
    expect(() => authenticate("nimeni@exemplu.ro", "parola-ana-1")).toThrowError(/greșită/);
  });

  it("keeps sessions as hashes, expires and destroys them", () => {
    const user = authenticate("ana@exemplu.ro", "parola-ana-1");
    const { token } = createSession(user.id, 1_000_000);
    const stored = getDb().prepare("SELECT token_hash FROM sessions").all() as { token_hash: string }[];
    expect(stored.some((row) => row.token_hash === token)).toBe(false);
    expect(userForToken(token, 1_000_001)?.id).toBe(user.id);
    expect(userForToken("alt-token", 1_000_001)).toBeNull();
    expect(userForToken(token, 1_000_000 + 31 * 24 * 60 * 60 * 1000)).toBeNull();
    const again = createSession(user.id);
    destroySession(again.token);
    expect(userForToken(again.token)).toBeNull();
  });

  it("changes the password and signs out the other devices", () => {
    const user = authenticate("ana@exemplu.ro", "parola-ana-1");
    const here = createSession(user.id);
    const there = createSession(user.id);
    expect(() => changePassword(user.id, "gresita", "parola-noua-1")).toThrowError(/actuală/);
    changePassword(user.id, "parola-ana-1", "parola-noua-1", here.token);
    expect(userForToken(here.token)?.id).toBe(user.id);
    expect(userForToken(there.token)).toBeNull();
    expect(authenticate("ana@exemplu.ro", "parola-noua-1").id).toBe(user.id);
  });
});

describe("request checks", () => {
  it("rejects unknown commands and malformed fields", () => {
    expect(() => parseCommand({ type: "stergeTot", args: {} })).toThrowError(ValidationError);
    expect(() => parseCommand({ type: "pay", args: { items: [], methodId: "pm-visa", usePoints: false, now: NOW, stamp: Date.now() } })).toThrowError(ValidationError);
    expect(() => parseCommand({ ...payCommand(Date.now()), args: { ...payCommand(Date.now()).args, now: "2031-01-01T10:00:00" } })).toThrowError(/data demo/);
    expect(() => parseCommand({ type: "addMethod", args: { method: { id: "pm-x1", brand: "visa", last4: "4000000000000000", holder: "Test Demo", expMonth: 8, expYear: 2029, label: "Card", isDefault: false } } })).toThrowError(/4 cifre/);
  });

  it("keeps only known fields and takes providers from the catalog", () => {
    const parsed = parseCommand({ type: "updateSettings", args: { patch: { appLock: true, admin: true } } });
    expect(parsed.args).toEqual({ patch: { appLock: true } });
    const template = PROVIDER_CATALOG[0];
    const connect = parseCommand({ type: "connectProvider", args: { template: { name: template.name, amount: 1 }, houseId: "acasa", clientCode: "ABC123", now: NOW, stamp: Date.now() } });
    expect(connect.type === "connectProvider" && connect.args.template.amount).toBe(template.amount);
    expect(() => parseCommand({ type: "connectProvider", args: { template: { name: "Furnizor Inventat" }, houseId: "acasa", clientCode: "ABC123", now: NOW, stamp: Date.now() } })).toThrowError(/catalog/);
  });

  it("accepts requests only from the same origin", () => {
    const ok = new Request("http://192.168.18.9:3000/api/state", { method: "POST", headers: { origin: "http://192.168.18.9:3000", host: "192.168.18.9:3000" } });
    const bad = new Request("http://192.168.18.9:3000/api/state", { method: "POST", headers: { origin: "http://alt-site.ro", host: "192.168.18.9:3000" } });
    expect(() => assertSameOrigin(ok)).not.toThrow();
    expect(() => assertSameOrigin(bad)).toThrowError(HttpError);
  });

  it("sets an http-only cookie and reads it back", () => {
    const request = new Request("http://localhost:3000/api/auth/login");
    const cookie = sessionCookie(request, "abc-123");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
    expect(readToken(new Request("http://localhost:3000/", { headers: { cookie: "alt=1; pago_session=abc-123" } }))).toBe("abc-123");
  });

  it("limits repeated attempts inside the window", () => {
    for (let i = 0; i < 3; i += 1) rateLimit("test:limit", 3, 1000);
    expect(() => rateLimit("test:limit", 3, 1000)).toThrowError(/Prea multe/);
    expect(() => rateLimit("test:limit", 3, 1000 + 11 * 60 * 1000)).not.toThrow();
  });
});

describe("saved state", () => {
  it("gives each account its own state and revision", () => {
    const ana = authenticate("ana@exemplu.ro", "parola-noua-1");
    const dan = createUser({ email: "dan@exemplu.ro", name: "Dan Ionescu", password: "parola-dan-1" });
    expect(loadState(ana.id).revision).toBe(1);
    runCommand(ana.id, { type: "finishOnboarding", args: {} });
    cancel(ana.id);
    expect(loadState(ana.id).revision).toBe(2);
    expect(loadState(ana.id).state.onboardingDone).toBe(true);
    expect(loadState(dan.id).state.onboardingDone).toBe(false);
    expect(loadState(dan.id).revision).toBe(1);
  });

  it("applies a payment exactly as the app does and advances it on the server", () => {
    const dan = authenticate("dan@exemplu.ro", "parola-dan-1");
    const command = payCommand(1_794_000_000_000);
    const expected = applyCommand(loadState(dan.id).state, command);
    const saved = runCommand(dan.id, parseCommand(command));
    cancel(dan.id);
    expect(saved.state).toEqual(expected);
    expect(saved.state.payments[0].status).toBe("procesare");
    expect(hasPendingWork(saved.state, NOW)).toBe(true);

    runStep(dan.id, "payments");
    const done = runStep(dan.id, "payments");
    expect(done.state.payments[0].status).toBe("confirmata");
    expect(done.state.bills.find((b) => b.id === "bill-digi")?.status).toBe("platita");
    expect(listPayments(dan.id)).toEqual([expect.objectContaining({ id: "pay-1794000000000-0", status: "confirmata", amount: 62 })]);
    expect(listActivity(dan.id).map((row) => row.kind)).toEqual(["system:payments", "system:payments", "pay"]);
  });

  it("refuses a wrong amount, a repeated payment and an unknown card", () => {
    const dan = authenticate("dan@exemplu.ro", "parola-dan-1");
    const before = loadState(dan.id).revision;
    expect(() => runCommand(dan.id, payCommand(1_794_000_000_001))).toThrowError(/deja făcută/);
    const gas = { ...digiItem(), eventId: "bill-gaz-2026-11", targetId: "bill-gaz", title: "E.ON Energie", amount: 1 };
    expect(() => runCommand(dan.id, { type: "pay", args: { items: [gas], methodId: "pm-visa", usePoints: false, now: NOW, stamp: 1_794_000_000_002 } })).toThrowError(/Suma nu corespunde/);
    expect(() => runCommand(dan.id, { type: "pay", args: { items: [{ ...gas, amount: 182 }], methodId: "pm-inexistent", usePoints: false, now: NOW, stamp: 1_794_000_000_003 } })).toThrowError(CommandRejected);
    expect(loadState(dan.id).revision).toBe(before);
  });

  it("fails a payment to a disconnected supplier, like the app", () => {
    const dan = authenticate("dan@exemplu.ro", "parola-dan-1");
    const gas = { ...digiItem(), eventId: "bill-gaz-2026-11", targetId: "bill-gaz", title: "E.ON Energie", amount: 182 };
    runCommand(dan.id, { type: "pay", args: { items: [gas], methodId: "pm-visa", usePoints: false, now: NOW, stamp: 1_794_000_000_004 } });
    cancel(dan.id);
    const failed = runStep(dan.id, "payments");
    expect(failed.state.payments.find((p) => p.eventId === "bill-gaz-2026-11")?.status).toBe("esuata");
  });

  it("resets the data but keeps the account, then deletes everything with it", () => {
    const dan = authenticate("dan@exemplu.ro", "parola-dan-1");
    const reset = resetState(dan.id);
    expect(reset.state.payments).toEqual([]);
    expect(currentState(dan.id).revision).toBe(reset.revision);
    cancel(dan.id);
    expect(() => deleteUser(dan.id, "gresita")).toThrowError(/Parola/);
    deleteUser(dan.id, "parola-dan-1");
    const left = getDb().prepare("SELECT COUNT(*) AS n FROM states WHERE user_id = ?").get(dan.id) as { n: number };
    expect(left.n).toBe(0);
    expect(() => authenticate("dan@exemplu.ro", "parola-dan-1")).toThrowError(/greșită/);
  });
});
