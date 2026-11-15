/**
 * Which cards would a seed run actually INSERT? (Inc24 FR9 + FR10)
 *
 * Two callers need this answer and they must never disagree:
 *
 *   FR9   `--sync` refuses to insert a card with no reviewed image.
 *   FR10  `--review` generates images for exactly the cards that would be inserted.
 *
 * If those sets could differ, an honest review sitting could still leave the guard
 * unsatisfied — or worse, satisfy it while leaving a card unreviewed. They are
 * therefore computed from ONE read and ONE pure function, so agreement is
 * structural rather than maintained.
 *
 * The read is deliberately a single join rather than a `cardExists` call per card:
 * 360 round-trips replaced by one, and — the load-bearing part — no theme id is
 * needed. `upsertTheme` WRITES, so review mode could not have used it; a theme that
 * does not exist yet simply contributes no keys, and all 30 of its cards fall into
 * the plan. `--review` performs exactly one read and zero writes.
 *
 * This module is PURE — the query lives in `pool-reads.ts` so the planner stays
 * testable without a database, per the repo's standing convention.
 */
import type { SeedFile } from "./seed-schema";

/** One card the run would insert. */
export interface PlannedInsert {
  theme: string;
  card: string;
}

/**
 * Separator for composite keys built from two user-authored strings.
 *
 * Written as an escape, never as a literal NUL in the source: a raw control byte
 * makes git classify the file as binary, so it stops being diffable or reviewable —
 * which is how this was originally, and how it nearly shipped.
 */
export const SEP = "\0";

/**
 * Composite key for a (theme, card) pair. NUL-separated because theme and card names
 * both contain spaces and punctuation, so any printable separator would let
 * ("A-B", "C") and ("A", "B-C") collide. A NUL cannot occur in either name.
 */
export function cardKey(themeName: string, cardName: string): string {
  return `${themeName}${SEP}${cardName}`;
}

/**
 * Cards in the seed file that are not yet published — pure set difference, in seed
 * order so the CLI's report reads in the same order as the file.
 *
 * `insertCardIfNew` still re-checks before writing, so this is a decision input and
 * an optimisation, never the write-time guarantee.
 */
export function planInserts(seed: SeedFile, published: Set<string>): PlannedInsert[] {
  const plan: PlannedInsert[] = [];
  for (const theme of seed.themes) {
    for (const card of theme.cards) {
      if (!published.has(cardKey(theme.name, card.name))) {
        plan.push({ theme: theme.name, card: card.name });
      }
    }
  }
  return plan;
}
