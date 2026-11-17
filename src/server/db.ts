import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS states (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    revision INTEGER NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    detail TEXT NOT NULL,
    revision INTEGER NOT NULL,
    at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS activity_user ON activity(user_id, id);

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reference TEXT NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    method TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, id)
  );
`;

const holder = globalThis as typeof globalThis & { pagoDb?: DatabaseSync; pagoDbPath?: string };

function resolvePath(): string {
  const configured = process.env.PAGO_DB_PATH;
  if (configured) return configured;
  return path.join(process.cwd(), "data", "pago.db");
}

export function getDb(): DatabaseSync {
  const target = resolvePath();
  if (holder.pagoDb && holder.pagoDbPath === target) return holder.pagoDb;
  if (holder.pagoDb) holder.pagoDb.close();
  if (target !== ":memory:") mkdirSync(path.dirname(target), { recursive: true });
  const db = new DatabaseSync(target);
  db.exec(SCHEMA);
  holder.pagoDb = db;
  holder.pagoDbPath = target;
  return db;
}

export function closeDb(): void {
  if (!holder.pagoDb) return;
  holder.pagoDb.close();
  holder.pagoDb = undefined;
  holder.pagoDbPath = undefined;
}

export function transaction<T>(run: () => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = run();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
