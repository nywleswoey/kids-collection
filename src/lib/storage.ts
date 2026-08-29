/**
 * SSR- and private-mode-safe Web Storage access. The browser storage globals
 * may be absent during SSR / node tests, and property access itself can throw
 * when storage is blocked; every read/write swallows failures so a missing or
 * blocked store is a silent no-op (get returns null, set does nothing).
 */

type StorageKind = "localStorage" | "sessionStorage";

function resolveStorage(kind: StorageKind): Storage | null {
  try {
    const g = globalThis as {
      localStorage?: Storage;
      sessionStorage?: Storage;
      window?: { localStorage?: Storage; sessionStorage?: Storage };
    };
    return g[kind] ?? g.window?.[kind] ?? null;
  } catch {
    return null;
  }
}

/** Get a value from storage; returns null if unavailable or blocked. */
export function storageGet(kind: StorageKind, key: string): string | null {
  const store = resolveStorage(kind);
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

/** Set a value in storage; silently fails if unavailable or blocked. */
export function storageSet(kind: StorageKind, key: string, value: string): void {
  const store = resolveStorage(kind);
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    /* storage blocked (private mode / quota) — silent, non-fatal */
  }
}
