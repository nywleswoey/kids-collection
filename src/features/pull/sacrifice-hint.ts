/**
 * First-duplicate sacrifice-hint gating (Inc13 FR4). Persisted per child in
 * localStorage (Q3.1=B — no DB migration). SSR- and private-mode-safe: any
 * failure just means the hint may show again, which is acceptable.
 */

import { storageGet, storageSet } from "@/lib/storage";

export function hintKey(childId: string): string {
  return `sacrifice-hint-seen:${childId}`;
}

export function hasSeenSacrificeHint(childId: string): boolean {
  return storageGet("localStorage", hintKey(childId)) === "1";
}

export function markSacrificeHintSeen(childId: string): void {
  storageSet("localStorage", hintKey(childId), "1");
}
