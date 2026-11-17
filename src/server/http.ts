import { AuthError, SESSION_COOKIE, SESSION_DAYS, userForToken, type PublicUser } from "./auth";
import { CommandRejected } from "./stateRepo";
import { ValidationError } from "./validate";

const MAX_BODY_BYTES = 200_000;
const WINDOW_MS = 10 * 60 * 1000;

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function json(data: unknown, init: { status?: number; headers?: HeadersInit } = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { status: init.status ?? 200, headers });
}

export function readToken(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function isSecure(request: Request): boolean {
  return request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
}

export function sessionCookie(request: Request, token: string): string {
  const parts = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`];
  if (isSecure(request)) parts.push("Secure");
  return parts.join("; ");
}

export function clearedCookie(request: Request): string {
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (isSecure(request)) parts.push("Secure");
  return parts.join("; ");
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError("Cerere respinsă.", 403);
  }
  if (!host || originHost !== host) throw new HttpError("Cerere respinsă.", 403);
}

export function requireUser(request: Request): PublicUser {
  const user = userForToken(readToken(request));
  if (!user) throw new HttpError("Nu ești autentificat.", 401);
  return user;
}

export async function readBody(request: Request): Promise<unknown> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) throw new HttpError("Cererea este prea mare.", 413);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError("Cererea nu este un JSON valid.", 400);
  }
}

type Bucket = { count: number; resetAt: number };
const holder = globalThis as typeof globalThis & { pagoLimits?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = (holder.pagoLimits ??= new Map());

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export function rateLimit(key: string, max: number, now: number = Date.now()): void {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
  if (bucket.count > max) throw new HttpError("Prea multe încercări. Încearcă din nou peste câteva minute.", 429);
}

export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

export async function handle(run: () => Promise<Response> | Response): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof HttpError || error instanceof AuthError || error instanceof CommandRejected) return json({ error: error.message }, { status: error.status });
    if (error instanceof ValidationError) return json({ error: error.message }, { status: 400 });
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("[pago-api]", error);
    return json({ error: "A apărut o problemă pe server. Încearcă din nou." }, { status: 500 });
  }
}
