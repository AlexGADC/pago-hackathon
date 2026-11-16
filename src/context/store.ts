import { createInitialState, restoreState, STORAGE_KEY, type AppState } from "./appState";

const serverState = createInitialState();
let state: AppState = serverState;
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = restoreState(JSON.parse(raw));
  } catch {
    state = serverState;
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
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
  update(change: (current: AppState) => AppState): void {
    load();
    const next = change(state);
    if (next === state) return;
    state = next;
    persist();
    emit();
  },
  reset(): void {
    loaded = true;
    state = createInitialState();
    persist();
    emit();
  },
};

const noop = () => undefined;

export function subscribeNever(): () => void {
  return noop;
}
