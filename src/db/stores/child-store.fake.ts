import type { ChildStore } from "./child-store";
import type { BalanceColumn } from "@/features/pull/pick-tickets";

/** Seed shape: `{ [childId]: { pullTokens?, epicTickets?, … } }`. Absent columns
 *  read as 0; a childId absent from the seed is an absent child. */
export type ChildSeed = Record<string, Partial<Record<BalanceColumn, number>>>;

/**
 * In-memory ChildStore — the second adapter that makes the seam real. Emulates
 * the observable Postgres contract: the `>= 1` guard on `spendOne` (returning the
 * resulting `pullTokens`, or null), the `GREATEST(0, …)` clamp on `clampedGrant`,
 * and null-on-absent-child. Kept honest by the shared contract suite.
 */
export function inMemoryChildStore(seed: ChildSeed = {}): ChildStore {
  const state = new Map<string, Partial<Record<BalanceColumn, number>>>();
  for (const [childId, cols] of Object.entries(seed)) {
    state.set(childId, { ...cols });
  }

  const val = (childId: string, column: BalanceColumn): number =>
    state.get(childId)?.[column] ?? 0;

  return {
    async spendOne(childId, column) {
      const row = state.get(childId);
      if (!row) return null;
      if ((row[column] ?? 0) < 1) return null; // guard failed
      row[column] = (row[column] ?? 0) - 1;
      return row.pullTokens ?? 0;
    },

    async incrementColumn(childId, column, by) {
      const row = state.get(childId);
      if (!row) return; // absent child → no-op, matching WHERE id = childId
      row[column] = (row[column] ?? 0) + by;
    },

    async clampedGrant(childId, column, delta) {
      const row = state.get(childId);
      if (!row) return null;
      const next = Math.max(0, (row[column] ?? 0) + delta);
      row[column] = next;
      return next;
    },

    async readColumn(childId, column) {
      return val(childId, column);
    },
  };
}
