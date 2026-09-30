/**
 * The one prune predicate (A1). Both `writer.ts` (the pruners) and
 * `blast-radius.ts` (`previewPrune`) need the same anti-join rule — "delete
 * rows whose name is absent from the keep list, and an EMPTY keep list means
 * every scoped row is doomed" — and used to write it separately: once in
 * `pruneNotIn`, once for doomed themes, once for cards dropped from a
 * surviving theme. Three copies of a rule is how the report drifts narrower
 * than the deletion without anyone changing the deletion.
 */
import { notInArray, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/**
 * Matches rows whose `col` is NOT in `keep`. An empty `keep` list matches
 * every row (an undefined WHERE clause) rather than none — the rule that a
 * category with nothing left to keep loses everything in scope, not nothing.
 */
export function notKept(col: PgColumn, keep: readonly string[]): SQL | undefined {
  return keep.length === 0 ? undefined : notInArray(col, [...keep]);
}
