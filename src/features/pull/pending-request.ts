/**
 * The client-generated request id for one pull tap (#kcpi), and its
 * persistence across reloads. Kept in sessionStorage per child until the
 * pull's outcome has been shown, so a reload (including the stuck panel's
 * "Try again") replays the SAME request instead of spending a new ticket.
 * Storage may be unavailable (private mode, blocked); a fresh id then just
 * means that one tap's idempotency won't survive a reload, not that the pull
 * itself is unsafe. See pull-service.ts `pull()` for the server contract.
 *
 * Ids carry a `pull_` prefix so they can't be confused with a bare UUID —
 * which is what a theme id (or any other `gen_random_uuid()` row id) looks
 * like, and what a pre-#kcpi bundle sends in this argument position.
 */

import { storageGet, storageRemove, storageSet } from "@/lib/storage";

const REQUEST_ID_RE = /^pull_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether `value` has the shape of an id minted by `getOrCreateRequestId`.
 *  A bare UUID (e.g. a theme id from a stale client) must not pass. */
export function isPullRequestId(value: unknown): value is string {
  return typeof value === "string" && REQUEST_ID_RE.test(value);
}

export function pendingRequestKey(childId: string): string {
  return `pull:pending:${childId}`;
}

/** The request id for the NEXT tap: reuse one still pending for this child
 *  (an earlier tap whose outcome was never shown), else mint and store one. */
export function getOrCreateRequestId(childId: string): string {
  const existing = storageGet("sessionStorage", pendingRequestKey(childId));
  if (isPullRequestId(existing)) return existing;
  const fresh = `pull_${crypto.randomUUID()}`;
  storageSet("sessionStorage", pendingRequestKey(childId), fresh);
  return fresh;
}

/** The pull's outcome has been shown — the NEXT tap mints a fresh id. */
export function clearPendingRequestId(childId: string): void {
  storageRemove("sessionStorage", pendingRequestKey(childId));
}

/**
 * Escape a stuck pull. Next.js sends one client's server actions one at a
 * time, so re-invoking the action would queue behind the hung one; only a
 * reload gets out. The pending id survives it, so the next tap resumes the
 * same pull server-side.
 */
export function reloadStuckPull(): void {
  window.location.reload();
}
