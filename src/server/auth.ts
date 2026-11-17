import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb, transaction } from "./db";

export const SESSION_COOKIE = "pago_session";
export const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const SCRYPT_KEY_LENGTH = 64;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

function toPublic(row: UserRow): PublicUser {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password.normalize("NFKC"), salt, SCRYPT_KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = scryptSync(password.normalize("NFKC"), Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function checkCredentials(email: string, password: string): void {
  if (!EMAIL_PATTERN.test(email) || email.length > 200) throw new AuthError("Adresa de e-mail nu pare corectă.");
  if (password.length < PASSWORD_MIN) throw new AuthError(`Parola trebuie să aibă cel puțin ${PASSWORD_MIN} caractere.`);
  if (password.length > PASSWORD_MAX) throw new AuthError("Parola este prea lungă.");
}

export function createUser(input: { email: string; name: string; password: string }): PublicUser {
  const email = normalizeEmail(input.email);
  const name = input.name.trim().slice(0, 60);
  checkCredentials(email, input.password);
  if (name.length < 2) throw new AuthError("Spune-ne cum te cheamă.");
  const db = getDb();
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) throw new AuthError("Există deja un cont cu această adresă.", 409);
  const row: UserRow = { id: randomUUID(), email, name, password_hash: hashPassword(input.password), created_at: new Date().toISOString() };
  db.prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(row.id, row.email, row.name, row.password_hash, row.created_at);
  return toPublic(row);
}

export function authenticate(emailInput: string, password: string): PublicUser {
  const email = normalizeEmail(emailInput);
  const row = getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  const ok = row ? verifyPassword(password, row.password_hash) : verifyPassword(password, hashPassword("parola-inexistenta"));
  if (!row || !ok) throw new AuthError("E-mail sau parolă greșită.", 401);
  return toPublic(row);
}

export function createSession(userId: string, now: number = Date.now()): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now + SESSION_MS);
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date(now).toISOString());
  db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(hashToken(token), userId, new Date(now).toISOString(), expiresAt.toISOString());
  return { token, expiresAt };
}

export function userForToken(token: string | undefined, now: number = Date.now()): PublicUser | null {
  if (!token) return null;
  const row = getDb()
    .prepare("SELECT u.*, s.expires_at AS expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?")
    .get(hashToken(token)) as (UserRow & { expires_at: string }) | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= now) {
    destroySession(token);
    return null;
  }
  return toPublic(row);
}

export function destroySession(token: string | undefined): void {
  if (!token) return;
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function changePassword(userId: string, current: string, next: string, keepToken?: string): void {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
  if (!row || !verifyPassword(current, row.password_hash)) throw new AuthError("Parola actuală nu este corectă.", 401);
  checkCredentials(row.email, next);
  transaction(() => {
    const db = getDb();
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(next), userId);
    if (keepToken) db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?").run(userId, hashToken(keepToken));
    else db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  });
}

export function deleteUser(userId: string, password: string): void {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) throw new AuthError("Parola nu este corectă.", 401);
  getDb().prepare("DELETE FROM users WHERE id = ?").run(userId);
}
