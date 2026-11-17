import { createInitialState, restoreState, STORAGE_KEY, type AppState } from "./appState";
import { applyCommand, type Command } from "./commands";

export interface StateEnvelope {
  state: unknown;
  revision: number;
}

type Mode = "local" | "remote";
type RemoteListener = (previous: AppState, next: AppState) => void;
type ProblemListener = (message: string, status: number) => void;

const serverState = createInitialState();
let state: AppState = serverState;
let loaded = false;
let mode: Mode = "local";
let revision = 0;
let queue: Command[] = [];
let sending = false;
const listeners = new Set<() => void>();
const remoteListeners = new Set<RemoteListener>();
const problemListeners = new Set<ProblemListener>();

function load(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    state = raw ? restoreState(JSON.parse(raw)) : serverState;
  } catch {
    state = serverState;
  }
}

function persist(): void {
  if (typeof window === "undefined" || mode !== "local") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

function report(message: string, status: number): void {
  for (const listener of problemListeners) listener(message, status);
}

function adopt(envelope: StateEnvelope, quiet = false): void {
  if (mode !== "remote") return;
  revision = envelope.revision;
  const next = restoreState(envelope.state);
  if (JSON.stringify(next) === JSON.stringify(state)) return;
  const previous = state;
  state = next;
  emit();
  if (!quiet) for (const listener of remoteListeners) listener(previous, next);
}

async function request(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  try {
    const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: response.ok, status: response.status, body };
  } catch {
    return { ok: false, status: 0, body: { error: "Nu am putut contacta serverul. Verifică conexiunea." } };
  }
}

async function pull(): Promise<void> {
  const result = await request("/api/state");
  if (mode !== "remote") return;
  if (!result.ok) {
    if (result.status === 401) report("Sesiunea a expirat. Intră din nou în cont.", 401);
    return;
  }
  if (sending || queue.length > 0) return;
  adopt(result.body as unknown as StateEnvelope);
}

async function flush(): Promise<void> {
  if (sending || mode !== "remote") return;
  sending = true;
  let last: StateEnvelope | null = null;
  while (queue.length > 0 && mode === "remote") {
    const result = await request("/api/commands", { method: "POST", body: JSON.stringify(queue[0], (_key, value) => (value === undefined ? null : value)) });
    if (mode !== "remote") break;
    if (result.ok) {
      queue.shift();
      last = result.body as unknown as StateEnvelope;
      continue;
    }
    queue = [];
    last = null;
    report(typeof result.body.error === "string" ? result.body.error : "Modificarea nu a putut fi salvată.", result.status);
    if (result.status !== 401) {
      const fresh = await request("/api/state");
      if (fresh.ok) last = fresh.body as unknown as StateEnvelope;
    }
  }
  sending = false;
  if (last && queue.length === 0) adopt(last, true);
  else if (queue.length > 0) void flush();
}

export const store = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): AppState {
    load();
    return state;
  },
  getServerSnapshot(): AppState {
    return serverState;
  },
  isRemote(): boolean {
    return mode === "remote";
  },
  isBusy(): boolean {
    return sending || queue.length > 0;
  },
  revision(): number {
    return revision;
  },
  update(change: (current: AppState) => AppState): void {
    if (mode !== "local") return;
    load();
    const next = change(state);
    if (next === state) return;
    state = next;
    persist();
    emit();
  },
  dispatch(command: Command): void {
    load();
    const next = applyCommand(state, command);
    if (next === state) return;
    state = next;
    emit();
    if (mode === "remote") {
      queue.push(command);
      void flush();
    } else {
      persist();
    }
  },
  connect(envelope: StateEnvelope): void {
    mode = "remote";
    loaded = true;
    queue = [];
    revision = envelope.revision;
    state = restoreState(envelope.state);
    emit();
  },
  disconnect(): void {
    mode = "local";
    queue = [];
    revision = 0;
    loaded = false;
    load();
    emit();
  },
  refresh(): void {
    if (mode !== "remote" || sending || queue.length > 0) return;
    void pull();
  },
  async reset(): Promise<void> {
    if (mode === "remote") {
      queue = [];
      const result = await request("/api/state", { method: "DELETE" });
      if (result.ok) adopt(result.body as unknown as StateEnvelope, true);
      else report(typeof result.body.error === "string" ? result.body.error : "Datele nu au putut fi resetate.", result.status);
      return;
    }
    loaded = true;
    state = createInitialState();
    persist();
    emit();
  },
  onRemoteChange(listener: RemoteListener): () => void {
    remoteListeners.add(listener);
    return () => {
      remoteListeners.delete(listener);
    };
  },
  onProblem(listener: ProblemListener): () => void {
    problemListeners.add(listener);
    return () => {
      problemListeners.delete(listener);
    };
  },
  request,
};

const noop = () => undefined;

export function subscribeNever(): () => void {
  return noop;
}
