import { useSyncExternalStore } from "react";
import { store, type StateEnvelope } from "./store";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export type SessionStatus = "loading" | "guest" | "local" | "user";

export interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
}

const MODE_KEY = "pago-home-family:mode";
const loadingState: SessionState = { status: "loading", user: null };
let current: SessionState = loadingState;
let started = false;
const listeners = new Set<() => void>();

function set(next: SessionState): void {
  current = next;
  for (const listener of listeners) listener();
}

function remember(local: boolean): void {
  try {
    if (local) window.localStorage.setItem(MODE_KEY, "local");
    else window.localStorage.removeItem(MODE_KEY);
  } catch {
    return;
  }
}

function prefersLocal(): boolean {
  try {
    return window.localStorage.getItem(MODE_KEY) === "local";
  } catch {
    return false;
  }
}

function errorOf(body: Record<string, unknown>): string {
  return typeof body.error === "string" ? body.error : "Ceva nu a mers. Încearcă din nou.";
}

function enter(body: Record<string, unknown>): void {
  remember(false);
  store.connect(body as unknown as StateEnvelope);
  set({ status: "user", user: body.user as SessionUser });
}

function leave(): void {
  store.disconnect();
  set({ status: "guest", user: null });
}

store.onProblem((_message, status) => {
  if (status === 401 && current.status === "user") leave();
});

export const session = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): SessionState {
    return current;
  },
  getServerSnapshot(): SessionState {
    return loadingState;
  },
  async start(): Promise<void> {
    if (started) return;
    started = true;
    if (prefersLocal()) {
      set({ status: "local", user: null });
      return;
    }
    const result = await store.request("/api/auth/me");
    if (result.ok && result.body.user) enter(result.body);
    else set({ status: "guest", user: null });
  },
  async login(email: string, password: string): Promise<string | null> {
    const result = await store.request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    if (!result.ok) return errorOf(result.body);
    enter(result.body);
    return null;
  },
  async register(name: string, email: string, password: string): Promise<string | null> {
    const result = await store.request("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
    if (!result.ok) return errorOf(result.body);
    enter(result.body);
    return null;
  },
  async logout(): Promise<void> {
    await store.request("/api/auth/logout", { method: "POST" });
    leave();
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<string | null> {
    const result = await store.request("/api/account", { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) });
    return result.ok ? null : errorOf(result.body);
  },
  async deleteAccount(password: string): Promise<string | null> {
    const result = await store.request("/api/account", { method: "DELETE", body: JSON.stringify({ password }) });
    if (!result.ok) return errorOf(result.body);
    leave();
    return null;
  },
  useLocal(): void {
    remember(true);
    store.disconnect();
    set({ status: "local", user: null });
  },
  showSignIn(): void {
    remember(false);
    set({ status: "guest", user: null });
  },
};

export function useSession(): SessionState {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot);
}
