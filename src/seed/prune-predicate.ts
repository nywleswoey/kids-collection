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
 *
 * `writer.ts`'s pruners (`deleteThemesNotIn` / `deleteCardsNotIn`) now refuse
 * an empty `keep` before calling this (`PruneEmptyKeepListError`, #96), so
 * they never actually exercise this branch — "prune everything in scope" is
 * not a thing those callers can ask for any more. `previewPrune` still can:
 * it is a read-only report, not a delete, and showing what an empty keep-list
 * WOULD do is exactly the preview's job.
 */
export function notKept(col: PgColumn, keep: readonly string[]): SQL | undefined {
  return keep.length === 0 ? undefined : notInArray(col, [...keep]);
}
