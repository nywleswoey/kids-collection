/**
 * Recovery for a page that was loaded before a deploy (#169).
 *
 * Server Action IDs are build artefacts, so a page that outlived a deploy holds
 * IDs the new build does not recognise, and its next action throws Next's
 * `UnrecognizedActionError`. A reload picks up the current build. This module
 * decides *whether* a failure is that case and, if so, reloads exactly once.
 *
 * Two invariants, both load-bearing in a children's app:
 *
 *  1. A genuine failure is never mistaken for a stale page. Detection is Next's
 *     own `unstable_isUnrecognizedActionError`; if that export ever disappears
 *     or changes, `isStaleDeploymentError` answers false, so an unrecognised
 *     shape is treated as a genuine error and keeps failing visibly.
 *  2. Recovery cannot loop. A reload is recorded in `sessionStorage`; a second
 *     stale failure inside `RELOAD_GUARD_MS` of it is surfaced instead of
 *     reloading again. If `sessionStorage` is unusable the guard cannot be
 *     recorded, so no reload happens at all.
 */
import * as navigation from "next/navigation";

export const RELOAD_GUARD_KEY = "stale-deploy-reloaded-at";
/** A reload loop repeats within seconds; a genuinely later deploy is > 1 min on. */
export const RELOAD_GUARD_MS = 60_000;
/** Long enough for a young child to read the notice before the page changes. */
export const NOTICE_MS = 2_500;

export function isStaleDeploymentError(error: unknown): boolean {
  try {
    const detect = (navigation as { unstable_isUnrecognizedActionError?: unknown })
      .unstable_isUnrecognizedActionError;
    return typeof detect === "function" && detect(error) === true;
  } catch {
    return false;
  }
}

export type StaleRecoveryDeps = {
  storage: () => Pick<Storage, "getItem" | "setItem">;
  reload: () => void;
  now: () => number;
  /** Runs `fn` after `ms`; returns nothing the caller needs. */
  schedule: (fn: () => void, ms: number) => void;
};

export type StaleRecovery = {
  /**
   * If `error` is a stale-deployment failure and no reload was tried lately,
   * shows the notice, reloads shortly, and returns true (the caller should stop
   * and show nothing of its own). Otherwise returns false: handle it as usual.
   * Idempotent while a reload is pending, so effects that run twice are safe.
   */
  recover(error: unknown): boolean;
  /** True from `recover` returning true until the page unloads. */
  isReloading(): boolean;
  subscribe(listener: () => void): () => void;
};

export function createStaleRecovery(
  deps: StaleRecoveryDeps,
  isStale: (error: unknown) => boolean = isStaleDeploymentError,
): StaleRecovery {
  let reloading = false;
  const listeners = new Set<() => void>();

  function guardAllowsReload(): boolean {
    try {
      const store = deps.storage();
      const last = Number(store.getItem(RELOAD_GUARD_KEY));
      const now = deps.now();
      if (Number.isFinite(last) && last > 0 && now - last < RELOAD_GUARD_MS) {
        return false;
      }
      store.setItem(RELOAD_GUARD_KEY, String(now));
      return true;
    } catch {
      return false;
    }
  }

  return {
    recover(error) {
      if (!isStale(error)) return false;
      if (reloading) return true;
      if (!guardAllowsReload()) return false;
      reloading = true;
      listeners.forEach((l) => l());
      deps.schedule(deps.reload, NOTICE_MS);
      return true;
    },
    isReloading: () => reloading,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** The page-wide instance. Browser-only: only ever called from client code. */
export const staleRecovery = createStaleRecovery({
  storage: () => window.sessionStorage,
  reload: () => window.location.reload(),
  now: () => Date.now(),
  schedule: (fn, ms) => void setTimeout(fn, ms),
});

export const recoverIfStale = (error: unknown): boolean =>
  staleRecovery.recover(error);
