/**
 * First-duplicate sacrifice-hint gating (Inc13 FR4). Persisted per child in
 * localStorage (Q3.1=B — no DB migration). SSR- and private-mode-safe: any
 * failure just means the hint may show again, which is acceptable.
 */

export function hintKey(childId: string): string {
  return `sacrifice-hint-seen:${childId}`;
}

export function hasSeenSacrificeHint(childId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(hintKey(childId)) === "1";
  } catch {
    return false;
  }
}

export function markSacrificeHintSeen(childId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(hintKey(childId), "1");
  } catch {
    // private mode / disabled storage — hint may re-show, acceptable.
  }
}
